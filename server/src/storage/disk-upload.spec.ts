import { Controller, Post, UploadedFile } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { DiskUpload } from './disk-upload.decorator';
import { StorageService } from './storage.service';
import { validateUpload } from './upload-media';
import { SHEET_MIMES } from './upload-mime';

jest.mock(
  'file-type',
  () => ({
    fileTypeFromBuffer: (data: Buffer) =>
      Promise.resolve(
        data.includes('%PDF-') ? { mime: 'application/pdf' } : undefined,
      ),
  }),
  { virtual: true },
);

@Controller()
class TestUploadController {
  @Post()
  @DiskUpload(SHEET_MIMES, 1)
  async upload(@UploadedFile() file: Express.Multer.File) {
    await validateUpload(SHEET_MIMES, file);
    return { size: file.size, buffered: !!file.buffer };
  }
}

it.each([
  [1024 ** 2, '%PDF-1.7', 201],
  [1024 ** 2 + 1, '%PDF-1.7', 413],
  [10, '<html>', 400],
])(
  '디스크 업로드 처리 후 임시 파일을 정리한다 (%s 바이트, %s, %s)',
  async (size, header, status) => {
    const root = mkdtempSync(join(tmpdir(), 'worshiplog-'));
    const module = await Test.createTestingModule({
      controllers: [TestUploadController],
      providers: [{ provide: StorageService, useValue: { root } }],
    }).compile();
    const app = module.createNestApplication();
    try {
      await app.init();
      const result = await request(app.getHttpServer())
        .post('/')
        .attach('file', Buffer.alloc(size, header), 'upload.bin')
        .expect(status);
      if (status === 201)
        expect(result.body).toEqual({ size, buffered: false });
      expect(readdirSync(join(root, '.incoming'))).toEqual([]);
    } finally {
      await app.close();
      rmSync(root, { recursive: true, force: true });
    }
  },
);
