import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';

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
        isPublic: dto.isPublic ?? false,
        createdBy: userId,
      },
    });
  }

  async findAll(userId: string, search?: string) {
    return this.prisma.song.findMany({
      where: {
        OR: [{ createdBy: userId }, { isPublic: true }],
        ...(search
          ? {
              AND: {
                OR: [
                  { title: { contains: search, mode: 'insensitive' } },
                  { artist: { contains: search, mode: 'insensitive' } },
                  { scriptureRef: { contains: search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
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
