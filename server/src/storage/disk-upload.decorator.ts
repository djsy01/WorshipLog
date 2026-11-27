import { BadRequestException, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { GENERIC_MIME, normalizeMime } from './upload-mime';
import {
  TemporaryUploadInterceptor,
  UploadRequest,
} from './temporary-upload.interceptor';

export function DiskUpload(allowed: string[], maxMiB: number) {
  return UseInterceptors(
    TemporaryUploadInterceptor,
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, callback) =>
          callback(null, (req as UploadRequest).uploadDirectory),
      }),
      limits: {
        fileSize: maxMiB * 1024 * 1024,
        fields: 0,
        files: 1,
        parts: 1,
      },
      fileFilter: (_req, file, callback) => {
        if (
          file.mimetype === GENERIC_MIME ||
          allowed.includes(normalizeMime(file.mimetype))
        )
          return callback(null, true);
        callback(
          new BadRequestException('지원하지 않는 파일 형식입니다.'),
          false,
        );
      },
    }),
  );
}
