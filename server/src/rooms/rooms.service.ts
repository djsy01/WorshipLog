import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateRoomDto) {
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: dto.orgId, userId } },
    });
    if (!member) throw new ForbiddenException('조직 멤버가 아닙니다.');

    return this.prisma.room.create({
      data: {
        orgId: dto.orgId,
        name: dto.name,
        description: dto.description,
        createdBy: userId,
      },
    });
  }

  async findByOrg(userId: string, orgId: string) {
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!member) throw new ForbiddenException('조직 멤버가 아닙니다.');

    return this.prisma.room.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(userId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('채팅방을 찾을 수 없습니다.');

    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: room.orgId, userId } },
    });
    if (!member || member.role !== 'leader') throw new ForbiddenException('팀장만 삭제할 수 있습니다.');

    await this.prisma.room.delete({ where: { id: roomId } });
    return { message: '삭제되었습니다.' };
  }

  async getMessages(userId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('채팅방을 찾을 수 없습니다.');

    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: room.orgId, userId } },
    });
    if (!member) throw new ForbiddenException('조직 멤버가 아닙니다.');

    return this.prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async createMessage(userId: string, roomId: string, dto: { content: string; fileUrl?: string }) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('채팅방을 찾을 수 없습니다.');

    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: room.orgId, userId } },
    });
    if (!member) throw new ForbiddenException('조직 멤버가 아닙니다.');

    return this.prisma.message.create({
      data: { roomId, userId, content: dto.content, fileUrl: dto.fileUrl ?? null },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async deleteMessage(userId: string, roomId: string, messageId: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('메시지를 찾을 수 없습니다.');
    if (msg.userId !== userId) throw new ForbiddenException('작성자만 삭제할 수 있습니다.');

    await this.prisma.message.delete({ where: { id: messageId } });
    return { message: '삭제되었습니다.' };
  }

  async getContis(userId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('채팅방을 찾을 수 없습니다.');

    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: room.orgId, userId } },
    });
    if (!member) throw new ForbiddenException('조직 멤버가 아닙니다.');

    return this.prisma.conti.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      include: {
        songs: { include: { song: true }, orderBy: { orderIndex: 'asc' } },
        creator: { select: { id: true, name: true } },
      },
    });
  }
}
