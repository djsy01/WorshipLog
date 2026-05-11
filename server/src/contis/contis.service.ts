import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContiDto } from './dto/create-conti.dto';
import { UpdateContiDto } from './dto/update-conti.dto';
import { AddSongDto } from './dto/add-song.dto';
import { UpdateContiSongDto } from './dto/update-conti-song.dto';

const CONTI_INCLUDE = {
  songs: {
    include: { song: true, sheets: { orderBy: { orderIndex: 'asc' as const } } },
    orderBy: { orderIndex: 'asc' as const },
  },
  creator: { select: { id: true, name: true } },
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
      where: { id },
      include: CONTI_INCLUDE,
    });
    if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    if (conti.createdBy === userId) return conti;

    // 채팅방에 공유된 콘티는 조직 멤버도 조회 가능
    if (conti.roomId) {
      const room = await this.prisma.room.findUnique({ where: { id: conti.roomId } });
      if (room) {
        const member = await this.prisma.orgMember.findUnique({
          where: { orgId_userId: { orgId: room.orgId, userId } },
        });
        if (member) return conti;
      }
    }
    throw new ForbiddenException('접근 권한이 없습니다.');
  }

  async update(userId: string, id: string, dto: UpdateContiDto) {
    const conti = await this.prisma.conti.findUnique({ where: { id } });
    if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    if (conti.createdBy !== userId) throw new ForbiddenException('수정 권한이 없습니다.');
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
    if (conti.createdBy !== userId) throw new ForbiddenException('삭제 권한이 없습니다.');
    await this.prisma.conti.delete({ where: { id } });
    return { message: '삭제되었습니다.' };
  }

  async shareWithRoom(userId: string, contiId: string, roomId: string) {
    const conti = await this.prisma.conti.findUnique({ where: { id: contiId } });
    if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    if (conti.createdBy !== userId) throw new ForbiddenException('공유 권한이 없습니다.');

    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('채팅방을 찾을 수 없습니다.');

    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: room.orgId, userId } },
    });
    if (!member) throw new ForbiddenException('조직 멤버가 아닙니다.');

    return this.prisma.conti.update({
      where: { id: contiId },
      data: { roomId },
      include: CONTI_INCLUDE,
    });
  }

  async unshare(userId: string, contiId: string) {
    const conti = await this.prisma.conti.findUnique({ where: { id: contiId } });
    if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    if (conti.createdBy !== userId) throw new ForbiddenException('권한이 없습니다.');

    return this.prisma.conti.update({
      where: { id: contiId },
      data: { roomId: null },
      include: CONTI_INCLUDE,
    });
  }

  // 변경 전용 - 오너만 가능 (내부용)
  private async assertOwner(userId: string, contiId: string): Promise<void> {
    const conti = await this.prisma.conti.findUnique({ where: { id: contiId } });
    if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    if (conti.createdBy !== userId) throw new ForbiddenException('수정 권한이 없습니다.');
  }

  async addSong(userId: string, contiId: string, dto: AddSongDto) {
    await this.assertOwner(userId, contiId);
    const count = await this.prisma.contiSong.count({ where: { contiId } });
    return this.prisma.contiSong.create({
      data: {
        contiId,
        songId: dto.songId,
        key: dto.key,
        note: dto.note,
        orderIndex: count,
      },
      include: { song: true, sheets: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async updateSong(userId: string, contiId: string, contiSongId: string, dto: UpdateContiSongDto) {
    await this.assertOwner(userId, contiId);
    return this.prisma.contiSong.update({
      where: { id: contiSongId },
      data: dto,
      include: { song: true, sheets: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async removeSong(userId: string, contiId: string, contiSongId: string) {
    await this.assertOwner(userId, contiId);
    await this.prisma.contiSong.delete({ where: { id: contiSongId } });
    const remaining = await this.prisma.contiSong.findMany({
      where: { contiId },
      orderBy: { orderIndex: 'asc' },
    });
    await this.prisma.$transaction(
      remaining.map((cs, i) =>
        this.prisma.contiSong.update({ where: { id: cs.id }, data: { orderIndex: i } }),
      ),
    );
    return { message: '삭제되었습니다.' };
  }

  async reorderSongs(userId: string, contiId: string, ids: string[]) {
    await this.assertOwner(userId, contiId);
    await this.prisma.$transaction([
      ...ids.map((id, i) =>
        this.prisma.contiSong.update({ where: { id }, data: { orderIndex: -(i + 1) } }),
      ),
      ...ids.map((id, i) =>
        this.prisma.contiSong.update({ where: { id }, data: { orderIndex: i } }),
      ),
    ]);
    return this.findOne(userId, contiId);
  }
}
