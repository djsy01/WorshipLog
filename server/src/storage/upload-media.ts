import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { open } from 'fs/promises';
import { GENERIC_MIME, normalizeMime } from './upload-mime';

async function detectMime(path: string) {
  const handle = await open(path);
  try {
    const buffer = Buffer.alloc(4100);
    const { bytesRead } = await handle.read(buffer);
    const detected = await fileTypeFromBuffer(
      buffer.subarray(0, bytesRead),
    ).catch(() => undefined);
    return detected && normalizeMime(detected.mime);
  } finally {
    await handle.close();
  }
}

export async function validateUpload(
  allowed: string[],
  file?: Express.Multer.File,
) {
  if (!file) throw new BadRequestException('파일이 없습니다.');
  const mime = await detectMime(file.path).catch(() => {
    throw new InternalServerErrorException('파일을 확인할 수 없습니다.');
  });
  const declared = normalizeMime(file.mimetype);
  if (
    !mime ||
    !allowed.includes(mime) ||
    (![GENERIC_MIME, mime].includes(declared) &&
      !(declared === 'audio/mp4' && mime === 'video/mp4'))
  ) {
    throw new BadRequestException(
      '파일 내용이 허용된 형식과 일치하지 않습니다.',
    );
  }
  file.mimetype = declared === 'audio/mp4' ? declared : mime;
}
