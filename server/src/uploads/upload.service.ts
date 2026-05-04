import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class UploadService {
  private _supabase: ReturnType<typeof createClient> | null = null;
  private bucket = 'sheet-music';

  constructor(private config: ConfigService) {}

  private get supabase() {
    if (!this._supabase) {
      const url = this.config.get<string>('SUPABASE_URL');
      const key = this.config.get<string>('SUPABASE_SERVICE_KEY');
      if (!url || !key) throw new InternalServerErrorException('Supabase 환경변수가 설정되지 않았습니다.');
      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  async upload(userId: string, file: Express.Multer.File): Promise<{ url: string }> {
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const path = `community/${userId}/${Date.now()}.${ext}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) throw new InternalServerErrorException('업로드 실패: ' + error.message);

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
    return { url: data.publicUrl };
  }
}
