import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { organizationDetails } from './organization-details';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrgDto) {
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        description: dto.description,
        createdBy: userId,
        members: { create: { userId, role: 'leader' } },
      },
      include: organizationDetails,
    });
  }

  async findMyOrgs(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: organizationDetails,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: organizationDetails,
    });
    if (!org) throw new NotFoundException('조직을 찾을 수 없습니다.');
    if (!org.members.some((m) => m.userId === userId))
      throw new ForbiddenException('조직 멤버가 아닙니다.');
    return org;
  }

  async remove(userId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw new NotFoundException('조직을 찾을 수 없습니다.');
    if (org.createdBy !== userId)
      throw new ForbiddenException('팀장만 삭제할 수 있습니다.');
    await this.prisma.organization.delete({
      where: { id: orgId, createdBy: userId },
    });
    return { message: '삭제되었습니다.' };
  }

  async leave(userId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw new NotFoundException('조직을 찾을 수 없습니다.');
    if (org.createdBy === userId)
      throw new BadRequestException(
        '팀장은 나갈 수 없습니다. 조직을 삭제하세요.',
      );
    const removed = await this.prisma.orgMember.deleteMany({
      where: { orgId, userId, role: { not: 'leader' } },
    });
    if (!removed.count)
      throw new ForbiddenException('조직에서 나갈 수 없습니다.');
    return { message: '조직에서 나갔습니다.' };
  }

  async kickMember(userId: string, orgId: string, targetUserId: string) {
    if (targetUserId === userId)
      throw new BadRequestException('자기 자신을 추방할 수 없습니다.');
    const actor = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!actor || (actor.role !== 'leader' && actor.role !== 'sub_leader')) {
      throw new ForbiddenException('방장 또는 부방장만 추방할 수 있습니다.');
    }
    const target = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('해당 멤버가 없습니다.');
    if (actor.role === 'sub_leader' && target.role !== 'member') {
      throw new ForbiddenException('부방장은 일반 멤버만 추방할 수 있습니다.');
    }
    if (target.role === 'leader')
      throw new ForbiddenException('방장은 추방할 수 없습니다.');
    const removed = await this.prisma.orgMember.deleteMany({
      where: {
        orgId,
        userId: targetUserId,
        role: target.role,
        org: { members: { some: { userId, role: actor.role } } },
      },
    });
    if (!removed.count)
      throw new ForbiddenException('추방 권한이 변경되었습니다.');
    return { message: '추방되었습니다.' };
  }

  async setSubLeader(
    userId: string,
    orgId: string,
    targetUserId: string,
    isSubLeader: boolean,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw new NotFoundException('조직을 찾을 수 없습니다.');
    if (org.createdBy !== userId)
      throw new ForbiddenException('팀장만 부방장을 설정할 수 있습니다.');
    if (targetUserId === userId)
      throw new BadRequestException('자기 자신에게 설정할 수 없습니다.');
    const target = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('해당 멤버가 없습니다.');
    if (target.role === 'leader')
      throw new BadRequestException('방장의 역할은 변경할 수 없습니다.');
    const updated = await this.prisma.orgMember.updateMany({
      where: {
        orgId,
        userId: targetUserId,
        role: { not: 'leader' },
        org: { createdBy: userId },
      },
      data: { role: isSubLeader ? 'sub_leader' : 'member' },
    });
    if (!updated.count) throw new ForbiddenException('변경 권한이 없습니다.');
    return this.prisma.organization.findUnique({
      where: { id: orgId },
      include: organizationDetails,
    });
  }

  async transferLeader(userId: string, orgId: string, targetUserId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw new NotFoundException('조직을 찾을 수 없습니다.');
    if (org.createdBy !== userId)
      throw new ForbiddenException('팀장만 방장을 이전할 수 있습니다.');
    if (targetUserId === userId)
      throw new BadRequestException('자기 자신에게 이전할 수 없습니다.');

    const target = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('해당 멤버가 없습니다.');

    await this.prisma.$transaction([
      this.prisma.organization.update({
        where: { id: orgId, createdBy: userId },
        data: { createdBy: targetUserId },
      }),
      this.prisma.orgMember.update({
        where: { orgId_userId: { orgId, userId } },
        data: { role: 'member' },
      }),
      this.prisma.orgMember.update({
        where: { orgId_userId: { orgId, userId: targetUserId } },
        data: { role: 'leader' },
      }),
    ]);

    return this.prisma.organization.findUnique({
      where: { id: orgId },
      include: organizationDetails,
    });
  }
}
