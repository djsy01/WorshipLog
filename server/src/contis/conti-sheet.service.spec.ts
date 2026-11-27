import { ContiSheetService } from './conti-sheet.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

describe('ContiSheetService', () => {
  const url = 'https://x.test/sheet.pdf';
  const file = {
    mimetype: 'application/pdf',
    path: 'upload.tmp',
  } as Express.Multer.File;
  const tx = {
    $queryRaw: jest.fn<Promise<{ id: string }[]>, unknown[]>(),
    contiSongSheet: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    contiSong: { findUniqueOrThrow: jest.fn() },
  };
  const prisma = {
    $transaction: (run: (client: typeof tx) => unknown) => run(tx),
  };
  const storage = { save: jest.fn(), removeByUrl: jest.fn() };
  const service = new ContiSheetService(
    prisma as unknown as PrismaService,
    storage as unknown as StorageService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    storage.save.mockResolvedValue(url);
    tx.$queryRaw.mockResolvedValue([{ id: 'song' }]);
    tx.contiSongSheet.aggregate.mockResolvedValue({ _max: { orderIndex: 4 } });
  });
  it('삭제로 간격이 생겨도 마지막 정렬 번호 뒤에 추가한다', async () => {
    await service.upload('owner', 'conti', 'song', file);
    expect(tx.$queryRaw.mock.calls[0][3]).toBe('owner');
    expect(tx.contiSongSheet.create).toHaveBeenCalledWith({
      data: { contiSongId: 'song', url, orderIndex: 5 },
    });
  });
  it('권한이 없으면 등록을 중단하고 파일을 삭제한다', async () => {
    tx.$queryRaw.mockResolvedValueOnce([]);
    await expect(
      service.upload('other', 'conti', 'song', file),
    ).rejects.toThrow();
    expect(tx.contiSongSheet.create).not.toHaveBeenCalled();
    expect(storage.removeByUrl).toHaveBeenCalledWith(url);
  });
  it('삭제할 악보를 URL의 콘티 곡으로 제한한다', async () => {
    const removal = service.remove('owner', 'conti', 'song', 'other-sheet');
    await expect(removal).rejects.toThrow();
    expect(tx.contiSongSheet.findUnique).toHaveBeenCalledWith({
      where: { id: 'other-sheet', contiSongId: 'song' },
      select: { url: true },
    });
    expect(tx.contiSongSheet.delete).not.toHaveBeenCalled();
  });
});
