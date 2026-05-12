import { Injectable, ForbiddenException, NotFoundException, MessageEvent } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { Subject, Observable } from 'rxjs';

@Injectable()
export class RoomsService {
  private readonly roomStreams = new Map<string, Subject<MessageEvent>>();
  private readonly orgStreams = new Map<string, Subject<MessageEvent>>();

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private getRoomStream(roomId: string): Subject<MessageEvent> {
    if (!this.roomStreams.has(roomId)) {
      this.roomStreams.set(roomId, new Subject<MessageEvent>());
    }
    return this.roomStreams.get(roomId)!;
  }

  getMessageStream(roomId: string): Observable<MessageEvent> {
    return this.getRoomStream(roomId).asObservable();
  }

  private getOrgStream(orgId: string): Subject<MessageEvent> {
    if (!this.orgStreams.has(orgId)) {
      this.orgStreams.set(orgId, new Subject<MessageEvent>());
    }
    return this.orgStreams.get(orgId)!;
  }

  getOrgMessageStream(orgId: string): Observable<MessageEvent> {
    return this.getOrgStream(orgId).asObservable();
  }

  async create(userId: string, dto: CreateRoomDto) {
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: dto.orgId, userId } },
    });
    if (!member) throw new ForbiddenException('조직 멤버가 아닙니다.');
    if (member.role !== 'leader' && member.role !== 'sub_leader') {
      throw new ForbiddenException('방장 또는 부방장만 채팅방을 생성할 수 있습니다.');
    }

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
    if (!member || (member.role !== 'leader' && member.role !== 'sub_leader')) {
      throw new ForbiddenException('방장 또는 부방장만 채팅방을 삭제할 수 있습니다.');
    }

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

    // 현재 유저 읽음 시각 갱신
    await this.prisma.roomRead.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId },
      update: { lastReadAt: new Date() },
    });

    const [totalMembers, reads, messages] = await Promise.all([
      this.prisma.orgMember.count({ where: { orgId: room.orgId } }),
      this.prisma.roomRead.findMany({ where: { roomId } }),
      this.prisma.message.findMany({
        where: { roomId },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

    return messages.map((msg) => {
      const readCount = reads.filter((r) => r.lastReadAt >= msg.createdAt).length;
      return { ...msg, unreadCount: Math.max(0, totalMembers - readCount) };
    });
  }

  async createMessage(userId: string, roomId: string, dto: { content: string; fileUrl?: string }) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('채팅방을 찾을 수 없습니다.');

    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: room.orgId, userId } },
    });
    if (!member) throw new ForbiddenException('조직 멤버가 아닙니다.');

    const message = await this.prisma.message.create({
      data: { roomId, userId, content: dto.content, fileUrl: dto.fileUrl ?? null },
      include: { user: { select: { id: true, name: true } } },
    });
    this.getRoomStream(roomId).next({ data: message });
    this.getOrgStream(room.orgId).next({ data: message });

    // 다른 멤버들에게 FCM 푸시 알림
    const members = await this.prisma.orgMember.findMany({
      where: { orgId: room.orgId, NOT: { userId } },
      include: { user: { select: { fcmToken: true } } },
    });
    const tokens = members.map((m) => m.user.fcmToken).filter((t): t is string => !!t);
    if (tokens.length > 0) {
      const senderName = (message as any).user?.name ?? '알 수 없음';
      this.notifications.sendToTokens(tokens, `#${room.name}`, `${senderName}: ${dto.content.slice(0, 80)}`, {
        roomId,
        roomName: room.name,
        orgId: room.orgId,
      });
    }

    return message;
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
      where: { shares: { some: { roomId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        songs: { include: { song: true }, orderBy: { orderIndex: 'asc' } },
        creator: { select: { id: true, name: true } },
        shares: { select: { roomId: true } },
      },
    });
  }
}
