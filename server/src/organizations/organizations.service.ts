import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async create(userId: string, dto: CreateOrgDto) {
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        description: dto.description,
        createdBy: userId,
        members: { create: { userId, role: 'leader' } },
      },
      include: this.orgInclude(),
    });
  }

  async findMyOrgs(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: this.orgInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: this.orgInclude(),
    });
    if (!org) throw new NotFoundException('조직을 찾을 수 없습니다.');
    if (!org.members.some((m) => m.userId === userId)) throw new ForbiddenException('조직 멤버가 아닙니다.');
    return org;
  }

  async remove(userId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('조직을 찾을 수 없습니다.');
    if (org.createdBy !== userId) throw new ForbiddenException('팀장만 삭제할 수 있습니다.');
    await this.prisma.organization.delete({ where: { id: orgId } });
    return { message: '삭제되었습니다.' };
  }

  // 링크 초대: 유효시간 안에 여러 명 사용 가능
  async createInvite(userId: string, orgId: string) {
    await this.findOne(userId, orgId);
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!member || member.role !== 'leader') throw new ForbiddenException('팀장만 초대 링크를 생성할 수 있습니다.');

    const token = randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const invite = await this.prisma.orgInvite.create({
      data: { orgId, token, createdBy: userId, expiresAt, status: 'link' },
    });
    return { token: invite.token, expiresAt: invite.expiresAt };
  }

  // 링크로 참여
  async joinByToken(userId: string, token: string) {
    const invite = await this.prisma.orgInvite.findUnique({ where: { token } });
    if (!invite || invite.status !== 'link') throw new NotFoundException('유효하지 않은 초대 링크입니다.');
    if (invite.expiresAt < new Date()) throw new BadRequestException('만료된 초대 링크입니다.');

    const existing = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: invite.orgId, userId } },
    });
    if (existing) throw new ConflictException('이미 멤버입니다.');

    await this.prisma.orgMember.create({ data: { orgId: invite.orgId, userId, role: 'member' } });
    return this.prisma.organization.findUnique({
      where: { id: invite.orgId },
      include: this.orgInclude(),
    });
  }

  // 이메일 초대: 수락 대기 상태로 생성
  async inviteByEmail(userId: string, orgId: string, email: string) {
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!member || member.role !== 'leader') throw new ForbiddenException('팀장만 초대할 수 있습니다.');

    const target = await this.prisma.user.findUnique({ where: { email } });
    if (!target) throw new NotFoundException('등록되지 않은 이메일입니다.');

    const existing = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: target.id } },
    });
    if (existing) throw new ConflictException('이미 팀 멤버입니다.');

    const alreadyInvited = await this.prisma.orgInvite.findFirst({
      where: { orgId, inviteeEmail: email, status: 'pending', expiresAt: { gt: new Date() } },
    });
    if (alreadyInvited) throw new ConflictException('이미 초대장을 보냈습니다.');

    const inviteToken = randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일
    await this.prisma.orgInvite.create({
      data: { orgId, token: inviteToken, createdBy: userId, expiresAt, inviteeEmail: email, status: 'pending' },
    });

    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    const inviter = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (org && inviter) {
      this.mail.sendTeamInviteEmail(email, inviter.name, org.name).catch(() => null);
    }

    return { message: `${email}님께 초대장을 보냈습니다.` };
  }

  // 내가 받은 초대 목록
  async getMyPendingInvites(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return [];

    return this.prisma.orgInvite.findMany({
      where: { inviteeEmail: user.email, status: 'pending', expiresAt: { gt: new Date() } },
      include: {
        org: { select: { id: true, name: true, description: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 초대 수락/거절
  async respondToInvite(userId: string, inviteId: string, accept: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw new NotFoundException();

    const invite = await this.prisma.orgInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.inviteeEmail !== user.email) throw new NotFoundException('초대장을 찾을 수 없습니다.');
    if (invite.status !== 'pending') throw new BadRequestException('이미 처리된 초대입니다.');
    if (invite.expiresAt < new Date()) throw new BadRequestException('만료된 초대입니다.');

    if (accept) {
      const existing = await this.prisma.orgMember.findUnique({
        where: { orgId_userId: { orgId: invite.orgId, userId } },
      });
      if (!existing) {
        await this.prisma.orgMember.create({ data: { orgId: invite.orgId, userId, role: 'member' } });
      }
    }

    await this.prisma.orgInvite.update({
      where: { id: inviteId },
      data: { status: accept ? 'accepted' : 'rejected', usedAt: new Date() },
    });

    if (accept) {
      return this.prisma.organization.findUnique({ where: { id: invite.orgId }, include: this.orgInclude() });
    }
    return { message: '초대를 거절했습니다.' };
  }

  async leave(userId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('조직을 찾을 수 없습니다.');
    if (org.createdBy === userId) throw new BadRequestException('팀장은 나갈 수 없습니다. 조직을 삭제하세요.');
    await this.prisma.orgMember.delete({ where: { orgId_userId: { orgId, userId } } });
    return { message: '조직에서 나갔습니다.' };
  }

  async kickMember(userId: string, orgId: string, targetUserId: string) {
    if (targetUserId === userId) throw new BadRequestException('자기 자신을 추방할 수 없습니다.');
    const actor = await this.prisma.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
    if (!actor || (actor.role !== 'leader' && actor.role !== 'sub_leader')) {
      throw new ForbiddenException('방장 또는 부방장만 추방할 수 있습니다.');
    }
    const target = await this.prisma.orgMember.findUnique({ where: { orgId_userId: { orgId, userId: targetUserId } } });
    if (!target) throw new NotFoundException('해당 멤버가 없습니다.');
    if (actor.role === 'sub_leader' && target.role !== 'member') {
      throw new ForbiddenException('부방장은 일반 멤버만 추방할 수 있습니다.');
    }
    if (target.role === 'leader') throw new ForbiddenException('방장은 추방할 수 없습니다.');
    await this.prisma.orgMember.delete({ where: { orgId_userId: { orgId, userId: targetUserId } } });
    return { message: '추방되었습니다.' };
  }

  async setSubLeader(userId: string, orgId: string, targetUserId: string, isSubLeader: boolean) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('조직을 찾을 수 없습니다.');
    if (org.createdBy !== userId) throw new ForbiddenException('팀장만 부방장을 설정할 수 있습니다.');
    if (targetUserId === userId) throw new BadRequestException('자기 자신에게 설정할 수 없습니다.');
    const target = await this.prisma.orgMember.findUnique({ where: { orgId_userId: { orgId, userId: targetUserId } } });
    if (!target) throw new NotFoundException('해당 멤버가 없습니다.');
    if (target.role === 'leader') throw new BadRequestException('방장의 역할은 변경할 수 없습니다.');
    await this.prisma.orgMember.update({
      where: { orgId_userId: { orgId, userId: targetUserId } },
      data: { role: isSubLeader ? 'sub_leader' : 'member' },
    });
    return this.prisma.organization.findUnique({ where: { id: orgId }, include: this.orgInclude() });
  }

  async transferLeader(userId: string, orgId: string, targetUserId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('조직을 찾을 수 없습니다.');
    if (org.createdBy !== userId) throw new ForbiddenException('팀장만 방장을 이전할 수 있습니다.');
    if (targetUserId === userId) throw new BadRequestException('자기 자신에게 이전할 수 없습니다.');

    const target = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('해당 멤버가 없습니다.');

    await this.prisma.$transaction([
      this.prisma.organization.update({ where: { id: orgId }, data: { createdBy: targetUserId } }),
      this.prisma.orgMember.update({ where: { orgId_userId: { orgId, userId } }, data: { role: 'member' } }),
      this.prisma.orgMember.update({ where: { orgId_userId: { orgId, userId: targetUserId } }, data: { role: 'leader' } }),
    ]);

    return this.prisma.organization.findUnique({ where: { id: orgId }, include: this.orgInclude() });
  }

  private orgInclude() {
    return {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      rooms: {
        orderBy: { createdAt: 'asc' as const },
        select: { id: true, name: true, description: true, createdAt: true, _count: { select: { messages: true } } },
      },
    };
  }
}
