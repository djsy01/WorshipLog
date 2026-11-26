import { ConfigService } from '@nestjs/config';
import {
  existsSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  const dir = mkdtempSync(join(tmpdir(), 'storage-'));
  const config = new ConfigService({
    UPLOAD_DIR: dir,
    PUBLIC_UPLOAD_URL: 'https://x.test/uploads/',
  });
  const storage = new StorageService(config);
  const key = 'user/song-93fad1aa-66cf-42dd-87f2-4454684a5671.pdf';
  const source = join(dir, 'temporary');

  beforeEach(() => writeFileSync(source, '%PDF-1.7'));
  afterAll(() => rmSync(dir, { force: true, recursive: true }));

  it('임시 파일을 공개 경로로 옮기고 URL로 삭제한다', async () => {
    const url = await storage.save(key, source);
    expect(url).toBe('https://x.test/uploads/' + key);
    expect(existsSync(source)).toBe(false);
    await storage.removeByUrl(url);
    expect(existsSync(join(dir, key))).toBe(false);
  });

  it.each(['../evil.pdf', 'user/../evil.pdf', '/evil.pdf', '.incoming/a.pdf'])(
    '허용되지 않는 경로 %s를 거부한다',
    async (path) => {
      await expect(storage.save(path, source)).rejects.toThrow();
      expect(existsSync(source)).toBe(true);
    },
  );

  it('외부 URL 및 잘못된 경로로 파일을 삭제하지 않는다', async () => {
    const url = await storage.save(key, source);
    await storage.removeByUrl(url.replace('x.test', 'old.supabase.co'));
    await storage.removeByUrl(url.replace('/user/', '/elsewhere/../user/'));
    expect(existsSync(join(dir, key))).toBe(true);
  });
  it('심볼릭 링크를 통해 저장 경로를 벗어나지 않는다', async () => {
    symlinkSync(tmpdir(), join(dir, 'link'));
    await expect(storage.save('link/test.pdf', source)).rejects.toThrow();
    expect(existsSync(source)).toBe(true);
  });
});
