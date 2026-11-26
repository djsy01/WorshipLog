import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Request } from 'express';
import { mkdir, mkdtemp, realpath, rm } from 'fs/promises';
import { join } from 'path';
import { lastValueFrom, of } from 'rxjs';
import { StorageService } from './storage.service';

export interface UploadRequest extends Request {
  uploadDirectory: string;
}

@Injectable()
export class TemporaryUploadInterceptor implements NestInterceptor<unknown> {
  private readonly logger = new Logger(TemporaryUploadInterceptor.name);

  constructor(private readonly storage: StorageService) {}

  async intercept(context: ExecutionContext, next: CallHandler<unknown>) {
    const req = context.switchToHttp().getRequest<UploadRequest>();
    if (!req.is('multipart/form-data')) {
      throw new BadRequestException('파일이 없습니다.');
    }
    try {
      await mkdir(this.storage.root, { recursive: true });
      const directory = join(await realpath(this.storage.root), '.incoming');
      await mkdir(directory, { mode: 0o700, recursive: true });
      if ((await realpath(directory)) !== directory) throw new Error();
      req.uploadDirectory = await mkdtemp(join(directory, 'upload-'));
    } catch {
      throw new InternalServerErrorException(
        '임시 업로드 경로를 만들 수 없습니다.',
      );
    }
    try {
      return of(await lastValueFrom(next.handle()));
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new PayloadTooLargeException('파일 크기 제한을 초과했습니다.');
      }
      throw error;
    } finally {
      await rm(req.uploadDirectory, { recursive: true, force: true }).catch(
        (error: unknown) =>
          this.logger.warn('임시 파일 삭제에 실패했습니다.', error),
      );
    }
  }
}
