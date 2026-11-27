import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { randomBytes } from 'crypto';

import { organizationDetails } from './organization-details';

@Injectable()
export class OrganizationInvitesService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  // 링크 초대: 유효시간 안에 여러 명 사용 가능
  async createInvite(userId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true },
    });
    if (!org) throw new NotFoundException('조직을 찾을 수 없습니다.');
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!member || member.role !== 'leader')
      throw new ForbiddenException('팀장만 초대 링크를 생성할 수 있습니다.');

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
    if (!invite || invite.status !== 'link')
      throw new NotFoundException('유효하지 않은 초대 링크입니다.');
    if (invite.expiresAt < new Date())
      throw new BadRequestException('만료된 초대 링크입니다.');

    const existing = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: invite.orgId, userId } },
    });
    if (existing) throw new ConflictException('이미 멤버입니다.');

    await this.prisma.orgMember.create({
      data: { orgId: invite.orgId, userId, role: 'member' },
    });
    return this.prisma.organization.findUnique({
      where: { id: invite.orgId },
      include: organizationDetails,
    });
  }

  // 이메일 초대: 수락 대기 상태로 생성
  async inviteByEmail(userId: string, orgId: string, email: string) {
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!member || member.role !== 'leader')
      throw new ForbiddenException('팀장만 초대할 수 있습니다.');

    const target = await this.prisma.user.findUnique({ where: { email } });
    if (!target) throw new NotFoundException('등록되지 않은 이메일입니다.');

    const existing = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: target.id } },
    });
    if (existing) throw new ConflictException('이미 팀 멤버입니다.');

    const alreadyInvited = await this.prisma.orgInvite.findFirst({
      where: {
        orgId,
        inviteeEmail: email,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    });
    if (alreadyInvited)
      throw new ConflictException('이미 초대장을 보냈습니다.');

    const inviteToken = randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일
    await this.prisma.orgInvite.create({
      data: {
        orgId,
        token: inviteToken,
        createdBy: userId,
        expiresAt,
        inviteeEmail: email,
        status: 'pending',
      },
    });

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const inviter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (org && inviter) {
      this.mail
        .sendTeamInviteEmail(email, inviter.name, org.name)
        .catch(() => null);
    }

    return { message: `${email}님께 초대장을 보냈습니다.` };
  }

  // 내가 받은 초대 목록
  async getMyPendingInvites(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) return [];

    return this.prisma.orgInvite.findMany({
      where: {
        inviteeEmail: user.email,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: {
        org: { select: { id: true, name: true, description: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 초대 수락/거절
  async respondToInvite(userId: string, inviteId: string, accept: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new NotFoundException();

    const invite = await this.prisma.orgInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.inviteeEmail !== user.email)
      throw new NotFoundException('초대장을 찾을 수 없습니다.');
    if (invite.status !== 'pending')
      throw new BadRequestException('이미 처리된 초대입니다.');
    if (invite.expiresAt < new Date())
      throw new BadRequestException('만료된 초대입니다.');

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.orgInvite.updateMany({
        where: {
          id: inviteId,
          status: 'pending',
          expiresAt: { gte: new Date() },
        },
        data: { status: accept ? 'accepted' : 'rejected', usedAt: new Date() },
      });
      if (!updated.count)
        throw new BadRequestException('이미 처리되었거나 만료된 초대입니다.');
      if (accept) {
        await tx.orgMember.upsert({
          where: { orgId_userId: { orgId: invite.orgId, userId } },
          create: { orgId: invite.orgId, userId, role: 'member' },
          update: {},
        });
      }
    });

    if (accept) {
      return this.prisma.organization.findUnique({
        where: { id: invite.orgId },
        include: organizationDetails,
      });
    }
    return { message: '초대를 거절했습니다.' };
  }
}
