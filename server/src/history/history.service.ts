import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { accessibleConti } from '../contis/conti-access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHistoryDto } from './dto/create-history.dto';

const contiInclude = {
  songs: { include: { song: true }, orderBy: { orderIndex: 'asc' } },
} satisfies Prisma.ContiInclude;

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateHistoryDto) {
    if (dto.contiId) {
      const conti = await this.prisma.conti.findUnique({
        where: { id: dto.contiId, ...accessibleConti(userId) },
        select: { id: true },
      });
      if (!conti) throw new NotFoundException('콘티를 찾을 수 없습니다.');
    }
    return this.prisma.history.create({
      data: {
        userId,
        contiId: dto.contiId || null,
        worshipDate: dto.worshipDate ? new Date(dto.worshipDate) : null,
      },
      include: { conti: { include: contiInclude } },
    });
  }

  async findAll(userId: string) {
    const records = await this.prisma.history.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const contis = await this.prisma.conti.findMany({
      where: {
        ...accessibleConti(userId),
        id: {
          in: records.flatMap(({ contiId }) => (contiId ? [contiId] : [])),
        },
      },
      include: contiInclude,
    });
    const byId = new Map(contis.map((conti) => [conti.id, conti]));
    return records.map((record) => ({
      ...record,
      conti: record.contiId ? (byId.get(record.contiId) ?? null) : null,
    }));
  }

  async findOne(userId: string, id: string) {
    const record = await this.prisma.history.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('히스토리를 찾을 수 없습니다.');
    if (record.userId !== userId)
      throw new ForbiddenException('접근 권한이 없습니다.');
    const conti = record.contiId
      ? await this.prisma.conti.findUnique({
          where: { id: record.contiId, ...accessibleConti(userId) },
          include: contiInclude,
        })
      : null;
    return { ...record, conti };
  }

  async remove(userId: string, id: string) {
    const record = await this.prisma.history.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('히스토리를 찾을 수 없습니다.');
    if (record.userId !== userId)
      throw new ForbiddenException('삭제 권한이 없습니다.');
    await this.prisma.history.delete({ where: { id } });
    return { message: '삭제되었습니다.' };
  }
}
