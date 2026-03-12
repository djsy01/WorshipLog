import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SheetMusicService {
  private _supabase: ReturnType<typeof createClient> | null = null;
  private bucket = 'sheet-music';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private get supabase() {
    if (!this._supabase) {
      const url = this.config.get<string>('SUPABASE_URL');
      const key = this.config.get<string>('SUPABASE_SERVICE_KEY');
      if (!url || !key) throw new InternalServerErrorException('Supabase 환경변수가 설정되지 않았습니다.');
      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  async upload(userId: string, songId: string, file: Express.Multer.File) {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('찬양을 찾을 수 없습니다.');
    if (song.createdBy !== userId) throw new ForbiddenException('업로드 권한이 없습니다.');

    // 기존 파일 삭제
    if (song.sheetMusicUrl) {
      const path = this.extractPath(song.sheetMusicUrl);
      if (path) await this.supabase.storage.from(this.bucket).remove([path]);
    }

    const ext = file.originalname.split('.').pop();
    const path = `${userId}/${songId}-${Date.now()}.${ext}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });

    if (error) throw new InternalServerErrorException('업로드 실패: ' + error.message);

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);

    return this.prisma.song.update({
      where: { id: songId },
      data: { sheetMusicUrl: data.publicUrl },
    });
  }

  async remove(userId: string, songId: string) {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('찬양을 찾을 수 없습니다.');
    if (song.createdBy !== userId) throw new ForbiddenException('삭제 권한이 없습니다.');

    if (song.sheetMusicUrl) {
      const path = this.extractPath(song.sheetMusicUrl);
      if (path) await this.supabase.storage.from(this.bucket).remove([path]);
    }

    return this.prisma.song.update({
      where: { id: songId },
      data: { sheetMusicUrl: null },
    });
  }

  private extractPath(url: string): string | null {
    // URL 형식: .../storage/v1/object/public/sheet-music/{path}
    const match = url.match(/\/sheet-music\/(.+)$/);
    return match ? match[1] : null;
  }
}
