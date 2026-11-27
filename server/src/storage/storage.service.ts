import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { realpath, rename, unlink } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { prepareDirectory } from './storage-paths';

const KEY = /^(?:[a-zA-Z0-9_-]+\/){1,2}[a-zA-Z0-9_-]+\.[a-z0-9]+$/;

@Injectable()
export class StorageService {
  readonly root: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(config: ConfigService) {
    const directory = config.get<string>('UPLOAD_DIR');
    const publicUrl = config.get<string>('PUBLIC_UPLOAD_URL');
    if (config.get('NODE_ENV') === 'production' && (!directory || !publicUrl)) {
      throw new Error('UPLOAD_DIR과 PUBLIC_UPLOAD_URL을 설정해야 합니다.');
    }
    this.root = resolve(directory || 'uploads');
    const port = config.get<string>('PORT') || '3000';
    const url = publicUrl || `http://localhost:${port}/uploads`;
    this.publicUrl = url.replace(/\/+$/, '');
  }

  async save(key: string, source: string): Promise<string> {
    if (!KEY.test(key)) {
      throw new InternalServerErrorException('잘못된 파일 경로입니다.');
    }
    try {
      const target = join(this.root, key);
      await prepareDirectory(this.root, dirname(key));
      await rename(source, target);
    } catch {
      throw new InternalServerErrorException('파일 저장에 실패했습니다.');
    }
    return `${this.publicUrl}/${key}`;
  }

  async removeByUrl(url: string | null) {
    if (!url?.startsWith(`${this.publicUrl}/`)) return;
    const key = url.slice(this.publicUrl.length + 1);
    if (!KEY.test(key)) return;
    try {
      const root = await realpath(this.root);
      const target = join(root, key);
      if ((await realpath(dirname(target))) !== dirname(target)) return;
      await unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn('업로드 파일 삭제에 실패했습니다.');
      }
    }
  }
}
