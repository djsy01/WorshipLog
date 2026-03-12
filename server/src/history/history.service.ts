import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHistoryDto } from './dto/create-history.dto';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateHistoryDto) {
    return this.prisma.history.create({
      data: {
        userId,
        contiId: dto.contiId ?? null,
        worshipDate: dto.worshipDate ? new Date(dto.worshipDate) : null,
      },
      include: {
        conti: {
          include: {
            songs: { include: { song: true }, orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.history.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        conti: {
          include: {
            songs: { include: { song: true }, orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const record = await this.prisma.history.findUnique({
      where: { id },
      include: {
        conti: {
          include: {
            songs: { include: { song: true }, orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });
    if (!record) throw new NotFoundException('히스토리를 찾을 수 없습니다.');
    if (record.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    return record;
  }

  async remove(userId: string, id: string) {
    const record = await this.prisma.history.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('히스토리를 찾을 수 없습니다.');
    if (record.userId !== userId) throw new ForbiddenException('삭제 권한이 없습니다.');
    await this.prisma.history.delete({ where: { id } });
    return { message: '삭제되었습니다.' };
  }
}
