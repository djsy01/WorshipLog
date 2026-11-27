import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { storeSheet } from '../songs/store-sheet';
import { StorageService } from '../storage/storage.service';
import { getContiSongWithSheets, lockContiSong } from './conti-sheet.queries';

@Injectable()
export class ContiSheetService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  upload(
    userId: string,
    contiId: string,
    contiSongId: string,
    file: Express.Multer.File,
  ) {
    return storeSheet(this.storage, userId, 'conti', file, (url) =>
      this.prisma.$transaction(async (tx) => {
        await lockContiSong(tx, userId, contiId, contiSongId);
        const { _max } = await tx.contiSongSheet.aggregate({
          where: { contiSongId },
          _max: { orderIndex: true },
        });
        const orderIndex = (_max.orderIndex ?? -1) + 1;
        await tx.contiSongSheet.create({
          data: { contiSongId, url, orderIndex },
        });
        return getContiSongWithSheets(tx, contiSongId);
      }),
    );
  }

  async remove(
    userId: string,
    contiId: string,
    contiSongId: string,
    sheetId: string,
  ) {
    const { updated, url } = await this.prisma.$transaction(async (tx) => {
      await lockContiSong(tx, userId, contiId, contiSongId);
      const where = { id: sheetId, contiSongId };
      const sheet = await tx.contiSongSheet.findUnique({
        where,
        select: { url: true },
      });
      if (!sheet) throw new NotFoundException('악보를 찾을 수 없습니다.');
      await tx.contiSongSheet.delete({ where });
      const updated = await getContiSongWithSheets(tx, contiSongId);
      return { updated, url: sheet.url };
    });
    await this.storage.removeByUrl(url);
    return updated;
  }
}
