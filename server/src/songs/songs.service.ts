import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';

// 성경 구절 범위 검색: "시 22-23" 저장 시 "시 23" 검색에도 매칭
function matchesScriptureSearch(ref: string, search: string): boolean {
  if (!ref) return false;
  if (ref.toLowerCase().includes(search.toLowerCase())) return true;

  const searchMatch = search.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
  if (!searchMatch) return false;

  const searchBook = searchMatch[1].trim().toLowerCase();
  const searchChapter = parseInt(searchMatch[2]);

  for (const part of ref.split(',').map((p) => p.trim())) {
    // "Book Ch1-Ch2" 형태 (장 범위)
    const chRange = part.match(/^(.+?)\s+(\d+)-(\d+)$/);
    if (chRange) {
      const refBook = chRange[1].trim().toLowerCase();
      const start = parseInt(chRange[2]);
      const end = parseInt(chRange[3]);
      if (refBook === searchBook && searchChapter >= start && searchChapter <= end) {
        return true;
      }
    }
  }
  return false;
}

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSongDto) {
    return this.prisma.song.create({
      data: {
        title: dto.title,
        artist: dto.artist,
        defaultKey: dto.defaultKey,
        tempo: dto.tempo,
        lyrics: dto.lyrics,
        scriptureRef: dto.scriptureRef,
        isPublic: dto.isPublic ?? true,
        createdBy: userId,
      },
    });
  }

  async findAll(userId: string, search?: string) {
    if (!search) {
      return this.prisma.song.findMany({
        where: { OR: [{ createdBy: userId }, { isPublic: true }] },
        orderBy: { createdAt: 'desc' },
      });
    }

    const songs = await this.prisma.song.findMany({
      where: { OR: [{ createdBy: userId }, { isPublic: true }] },
      orderBy: { createdAt: 'desc' },
    });

    const q = search.toLowerCase();
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(q) ||
        (song.artist?.toLowerCase().includes(q) ?? false) ||
        (song.scriptureRef
          ? matchesScriptureSearch(song.scriptureRef, search)
          : false),
    );
  }

  async findOne(userId: string, id: string) {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('찬양을 찾을 수 없습니다.');
    if (!song.isPublic && song.createdBy !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }
    return song;
  }

  async update(userId: string, id: string, dto: UpdateSongDto) {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('찬양을 찾을 수 없습니다.');
    if (song.createdBy !== userId) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }
    return this.prisma.song.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('찬양을 찾을 수 없습니다.');
    if (song.createdBy !== userId) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }
    await this.prisma.song.delete({ where: { id } });
    return { message: '삭제되었습니다.' };
  }
}
