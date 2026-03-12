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
      include: { songs: { include: { song: true }, orderBy: { orderIndex: 'asc' } } },
    });
  }

  async findAll(userId: string) {
    return this.prisma.conti.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        songs: { include: { song: true }, orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const conti = await this.prisma.conti.findUnique({
      where: { id },
      include: {
        songs: { include: { song: true }, orderBy: { orderIndex: 'asc' } },
      },
    });
    if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    if (conti.createdBy !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    return conti;
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
      include: { songs: { include: { song: true }, orderBy: { orderIndex: 'asc' } } },
    });
  }

  async remove(userId: string, id: string) {
    const conti = await this.prisma.conti.findUnique({ where: { id } });
    if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    if (conti.createdBy !== userId) throw new ForbiddenException('삭제 권한이 없습니다.');
    await this.prisma.conti.delete({ where: { id } });
    return { message: '삭제되었습니다.' };
  }

  async addSong(userId: string, contiId: string, dto: AddSongDto) {
    await this.findOne(userId, contiId);
    const count = await this.prisma.contiSong.count({ where: { contiId } });
    return this.prisma.contiSong.create({
      data: {
        contiId,
        songId: dto.songId,
        key: dto.key,
        note: dto.note,
        orderIndex: count,
      },
      include: { song: true },
    });
  }

  async updateSong(userId: string, contiId: string, contiSongId: string, dto: UpdateContiSongDto) {
    await this.findOne(userId, contiId);
    return this.prisma.contiSong.update({
      where: { id: contiSongId },
      data: dto,
      include: { song: true },
    });
  }

  async removeSong(userId: string, contiId: string, contiSongId: string) {
    await this.findOne(userId, contiId);
    await this.prisma.contiSong.delete({ where: { id: contiSongId } });
    // 순서 재정렬
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
    await this.findOne(userId, contiId);
    // 충돌 방지: 먼저 음수로 설정 후 실제 값으로 변경
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
