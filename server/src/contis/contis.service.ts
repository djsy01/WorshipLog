import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { accessibleConti } from './conti-access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContiDto } from './dto/create-conti.dto';
import { UpdateContiDto } from './dto/update-conti.dto';
import { AddSongDto } from './dto/add-song.dto';
import { UpdateContiSongDto } from './dto/update-conti-song.dto';

const CONTI_INCLUDE = {
  songs: {
    include: {
      song: true,
      sheets: { orderBy: { orderIndex: 'asc' as const } },
    },
    orderBy: { orderIndex: 'asc' as const },
  },
  creator: { select: { id: true, name: true } },
  shares: { select: { roomId: true } },
};

@Injectable()
export class ContisService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateContiDto) {
    return this.prisma.conti.create({
      data: {
        title: dto.title,
        description: dto.description,
        worshipDate: dto.worshipDate ? new Date(dto.worshipDate) : undefined,
        createdBy: userId,
      },
      include: CONTI_INCLUDE,
    });
  }

  async findAll(userId: string) {
    return this.prisma.conti.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      include: CONTI_INCLUDE,
    });
  }

  // GET 전용 - 팀 멤버도 조회 가능
  async findOne(userId: string, id: string) {
    const conti = await this.prisma.conti.findUnique({
      where: { id, ...accessibleConti(userId) },
      include: CONTI_INCLUDE,
    });
    if (conti) return conti;
    const exists = await this.prisma.conti.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    throw new ForbiddenException('접근 권한이 없습니다.');
  }

  async update(userId: string, id: string, dto: UpdateContiDto) {
    const conti = await this.prisma.conti.findUnique({ where: { id } });
    if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    if (conti.createdBy !== userId)
      throw new ForbiddenException('수정 권한이 없습니다.');
    return this.prisma.conti.update({
      where: { id },
      data: {
        ...dto,
        worshipDate: dto.worshipDate ? new Date(dto.worshipDate) : undefined,
      },
      include: CONTI_INCLUDE,
    });
  }

  async remove(userId: string, id: string) {
    const conti = await this.prisma.conti.findUnique({ where: { id } });
    if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    if (conti.createdBy !== userId)
      throw new ForbiddenException('삭제 권한이 없습니다.');
    await this.prisma.conti.delete({ where: { id } });
    return { message: '삭제되었습니다.' };
  }

  async shareWithRoom(userId: string, contiId: string, roomId: string) {
    const conti = await this.prisma.conti.findUnique({
      where: { id: contiId },
    });
    if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    if (conti.createdBy !== userId)
      throw new ForbiddenException('공유 권한이 없습니다.');

    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('채팅방을 찾을 수 없습니다.');

    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: room.orgId, userId } },
    });
    if (!member || (member.role !== 'leader' && member.role !== 'sub_leader')) {
      throw new ForbiddenException('방장 또는 부방장만 공유할 수 있습니다.');
    }

    await this.prisma.contiShare.upsert({
      where: { contiId_roomId: { contiId, roomId } },
      create: { contiId, roomId, sharedBy: userId },
      update: {},
    });

    return this.findOne(userId, contiId);
  }

  async unshareFromRoom(userId: string, contiId: string, roomId: string) {
    const conti = await this.prisma.conti.findUnique({
      where: { id: contiId },
    });
    if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    if (conti.createdBy !== userId)
      throw new ForbiddenException('권한이 없습니다.');

    await this.prisma.contiShare.deleteMany({ where: { contiId, roomId } });

    return this.findOne(userId, contiId);
  }

  private editSongs<T>(
    userId: string,
    contiId: string,
    edit: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const [conti] = await tx.$queryRaw<{ createdBy: string }[]>`
        SELECT created_by AS "createdBy" FROM contis WHERE id = ${contiId}
        FOR UPDATE
      `;
      if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
      if (conti.createdBy !== userId)
        throw new ForbiddenException('수정 권한이 없습니다.');
      return edit(tx);
    });
  }

  addSong(userId: string, contiId: string, dto: AddSongDto) {
    return this.editSongs(userId, contiId, async (tx) => {
      const song = await tx.song.findUnique({
        where: {
          id: dto.songId,
          OR: [{ createdBy: userId }, { isPublic: true }],
        },
        select: { id: true },
      });
      if (!song) throw new NotFoundException('찬양을 찾을 수 없습니다.');
      const { _max } = await tx.contiSong.aggregate({
        where: { contiId },
        _max: { orderIndex: true },
      });
      return tx.contiSong.create({
        data: {
          contiId,
          songId: dto.songId,
          key: dto.key,
          note: dto.note,
          orderIndex: (_max.orderIndex ?? -1) + 1,
        },
        include: { song: true, sheets: { orderBy: { orderIndex: 'asc' } } },
      });
    });
  }

  updateSong(
    userId: string,
    contiId: string,
    contiSongId: string,
    dto: UpdateContiSongDto,
  ) {
    return this.editSongs(userId, contiId, async (tx) => {
      const where = { id: contiSongId, contiId };
      const song = await tx.contiSong.findUnique({
        where,
        select: { id: true },
      });
      if (!song) throw new NotFoundException('콘티 곡을 찾을 수 없습니다.');
      return tx.contiSong.update({
        where,
        data: dto,
        include: { song: true, sheets: { orderBy: { orderIndex: 'asc' } } },
      });
    });
  }

  removeSong(userId: string, contiId: string, contiSongId: string) {
    return this.editSongs(userId, contiId, async (tx) => {
      const result = await tx.contiSong.deleteMany({
        where: { id: contiSongId, contiId },
      });
      if (!result.count)
        throw new NotFoundException('콘티 곡을 찾을 수 없습니다.');
      const remaining = await tx.contiSong.findMany({
        where: { contiId },
        orderBy: { orderIndex: 'asc' },
        select: { id: true },
      });
      for (const [orderIndex, { id }] of remaining.entries()) {
        await tx.contiSong.update({
          where: { id, contiId },
          data: { orderIndex },
        });
      }
      return { message: '삭제되었습니다.' };
    });
  }

  async clone(userId: string, contiId: string) {
    const original = await this.findOne(userId, contiId);
    const cloned = await this.prisma.conti.create({
      data: {
        title: `${original.title} (복제)`,
        description: original.description ?? undefined,
        worshipDate: original.worshipDate
          ? new Date(original.worshipDate)
          : undefined,
        createdBy: userId,
        songs: {
          create: original.songs.map((cs, i) => ({
            songId: cs.songId,
            key: cs.key ?? undefined,
            tempo: cs.tempo ?? undefined,
            note: cs.note ?? undefined,
            orderIndex: i,
          })),
        },
      },
      include: CONTI_INCLUDE,
    });
    return cloned;
  }

  async reorderSongs(userId: string, contiId: string, ids: string[]) {
    await this.editSongs(userId, contiId, async (tx) => {
      const songs = await tx.contiSong.findMany({
        where: { contiId },
        select: { id: true },
      });
      const requestedIds = new Set(ids);
      if (
        ids.length !== songs.length ||
        !songs.every(({ id }) => requestedIds.has(id))
      ) {
        throw new BadRequestException(
          '콘티의 모든 곡을 한 번씩 지정해야 합니다.',
        );
      }
      for (const [i, id] of ids.entries()) {
        await tx.contiSong.update({
          where: { id, contiId },
          data: { orderIndex: -(i + 1) },
        });
      }
      for (const [orderIndex, id] of ids.entries()) {
        await tx.contiSong.update({
          where: { id, contiId },
          data: { orderIndex },
        });
      }
    });
    return this.findOne(userId, contiId);
  }
}
