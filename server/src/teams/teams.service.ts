import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTeamDto) {
    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        description: dto.description,
        createdBy: userId,
        members: {
          create: { userId, role: 'leader' },
        },
      },
      include: this.teamInclude(),
    });
    return team;
  }

  async findMyTeams(userId: string) {
    return this.prisma.team.findMany({
      where: { members: { some: { userId } } },
      include: this.teamInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: this.teamInclude(),
    });
    if (!team) throw new NotFoundException('팀을 찾을 수 없습니다.');
    const isMember = team.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('팀 멤버가 아닙니다.');
    return team;
  }

  async remove(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('팀을 찾을 수 없습니다.');
    if (team.createdBy !== userId) throw new ForbiddenException('팀장만 삭제할 수 있습니다.');
    await this.prisma.team.delete({ where: { id: teamId } });
    return { message: '삭제되었습니다.' };
  }

  // 초대 링크 생성 (24시간 유효)
  async createInvite(userId: string, teamId: string) {
    await this.findOne(userId, teamId);
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member || member.role !== 'leader') {
      throw new ForbiddenException('팀장만 초대 링크를 생성할 수 있습니다.');
    }

    const token = randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const invite = await this.prisma.teamInvite.create({
      data: { teamId, token, createdBy: userId, expiresAt },
    });
    return { token: invite.token, expiresAt: invite.expiresAt };
  }

  // 초대 토큰으로 팀 가입
  async joinByToken(userId: string, token: string) {
    const invite = await this.prisma.teamInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('유효하지 않은 초대 링크입니다.');
    if (invite.expiresAt < new Date()) throw new BadRequestException('만료된 초대 링크입니다.');

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: invite.teamId, userId } },
    });
    if (existing) throw new ConflictException('이미 팀 멤버입니다.');

    await this.prisma.teamMember.create({
      data: { teamId: invite.teamId, userId, role: 'member' },
    });

    return this.prisma.team.findUnique({
      where: { id: invite.teamId },
      include: this.teamInclude(),
    });
  }

  // 팀 나가기
  async leave(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('팀을 찾을 수 없습니다.');
    if (team.createdBy === userId) throw new BadRequestException('팀장은 팀을 나갈 수 없습니다. 팀을 삭제하세요.');

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });
    return { message: '팀에서 나갔습니다.' };
  }

  // 멤버 추방 (팀장만)
  async kickMember(userId: string, teamId: string, targetUserId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('팀을 찾을 수 없습니다.');
    if (team.createdBy !== userId) throw new ForbiddenException('팀장만 멤버를 추방할 수 있습니다.');
    if (targetUserId === userId) throw new BadRequestException('자기 자신을 추방할 수 없습니다.');

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    return { message: '추방되었습니다.' };
  }

  // 방장 이전 (팀장만)
  async transferLeader(userId: string, teamId: string, targetUserId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('팀을 찾을 수 없습니다.');
    if (team.createdBy !== userId) throw new ForbiddenException('팀장만 방장을 이전할 수 있습니다.');
    if (targetUserId === userId) throw new BadRequestException('자기 자신에게 이전할 수 없습니다.');

    const targetMember = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    if (!targetMember) throw new NotFoundException('해당 멤버가 없습니다.');

    await this.prisma.$transaction([
      this.prisma.team.update({ where: { id: teamId }, data: { createdBy: targetUserId } }),
      this.prisma.teamMember.update({ where: { teamId_userId: { teamId, userId } }, data: { role: 'member' } }),
      this.prisma.teamMember.update({ where: { teamId_userId: { teamId, userId: targetUserId } }, data: { role: 'leader' } }),
    ]);

    return this.prisma.team.findUnique({ where: { id: teamId }, include: this.teamInclude() });
  }

  async getTeamPosts(userId: string, teamId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member) throw new ForbiddenException('팀 멤버가 아닙니다.');

    return this.prisma.communityPost.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async createPost(userId: string, teamId: string, dto: { content: string }) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member) throw new ForbiddenException('팀 멤버가 아닙니다.');

    return this.prisma.communityPost.create({
      data: { teamId, userId, content: dto.content },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async deletePost(userId: string, teamId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('포스트를 찾을 수 없습니다.');
    if (post.userId !== userId) throw new ForbiddenException('작성자만 삭제할 수 있습니다.');

    await this.prisma.communityPost.delete({ where: { id: postId } });
    return { message: '삭제되었습니다.' };
  }

  async getTeamContis(userId: string, teamId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member) throw new ForbiddenException('팀 멤버가 아닙니다.');

    return this.prisma.conti.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      include: {
        songs: { include: { song: true }, orderBy: { orderIndex: 'asc' } },
        creator: { select: { id: true, name: true } },
      },
    });
  }

  private teamInclude() {
    return {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    };
  }
}
