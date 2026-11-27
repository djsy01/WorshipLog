import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { storeSheet } from './store-sheet';

@Injectable()
export class SheetMusicService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  upload(userId: string, songId: string, file: Express.Multer.File) {
    return storeSheet(this.storage, userId, 'song', file, (url) =>
      this.replace(songId, url),
    );
  }

  remove(songId: string) {
    return this.replace(songId, null);
  }

  private async replace(songId: string, url: string | null) {
    const { updated, previous } = await this.prisma.$transaction(async (tx) => {
      const [song] = await tx.$queryRaw<{ sheet_music_url: string | null }[]>`
        SELECT sheet_music_url FROM songs WHERE id = ${songId} FOR UPDATE
      `;
      if (!song) throw new NotFoundException('찬양을 찾을 수 없습니다.');
      const updated = await tx.song.update({
        where: { id: songId },
        data: { sheetMusicUrl: url },
      });
      return { updated, previous: song.sheet_music_url };
    });
    await this.storage.removeByUrl(previous);
    return updated;
  }
}
