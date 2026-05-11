'use client';

import { useRef, useState } from 'react';
import { contisApi, type Conti, type ContiSong } from '@/lib/api';

interface Props {
  conti: Conti;
  contiId: string;
  token: string;
  onMove: (index: number, dir: 'up' | 'down') => void;
  onRemoveSong: (id: string) => void;
  onEditSong: (cs: ContiSong) => void;
  onOpenAddSong: () => void;
  onPrint: () => void;
  onSheetChange: () => void;
}

export default function ContiSongList({ conti, contiId, token, onMove, onRemoveSong, onEditSong, onOpenAddSong, onPrint, onSheetChange }: Props) {
  const [expandedSheetId, setExpandedSheetId] = useState<string | null>(null);
  const [uploadingSheetId, setUploadingSheetId] = useState<string | null>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const sheetTargetContiSongId = useRef<string | null>(null);

  const handleSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const contiSongId = sheetTargetContiSongId.current;
    if (!file || !contiSongId) return;
    setUploadingSheetId(contiSongId);
    try {
      await contisApi.uploadContiSheet(token, contiId, contiSongId, file);
      onSheetChange();
    } catch (err) {
      alert((err as Error).message || '악보 업로드에 실패했습니다.');
    } finally {
      setUploadingSheetId(null);
      sheetTargetContiSongId.current = null;
      if (sheetInputRef.current) sheetInputRef.current.value = '';
    }
  };

  const handleSheetDelete = async (contiSongId: string, sheetId: string) => {
    await contisApi.deleteContiSheet(token, contiId, contiSongId, sheetId);
    onSheetChange();
  };

  return (
    <>
      <div className="mb-1 sm:mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">
          찬양 목록 <span className="ml-1 text-sm font-normal text-gray-400">({conti.songs.length}곡)</span>
        </h2>
        <div className="print:hidden flex shrink-0 gap-2">
          <button
            onClick={onPrint}
            disabled={conti.songs.length === 0}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            공유하기 (PDF)
          </button>
          <button onClick={onOpenAddSong} className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700">
            + 찬양 추가
          </button>
        </div>
      </div>

      {conti.songs.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center dark:border-gray-700">
          <p className="text-gray-400 dark:text-gray-500">아직 찬양이 없습니다.</p>
          <button onClick={onOpenAddSong} className="mt-2 text-sm font-medium text-violet-500 hover:underline">
            찬양 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {conti.songs.map((cs, index) => {
            const sheetOpen = expandedSheetId === cs.id;
            return (
              <div key={cs.id} className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                <div className="flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4">
                  <span className="w-6 shrink-0 text-center text-sm font-bold text-gray-300 dark:text-gray-600 sm:w-7">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-white sm:text-base">{cs.song.title}</span>
                      {(cs.key ?? cs.song.defaultKey) && (
                        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                          {cs.key ?? cs.song.defaultKey}
                        </span>
                      )}
                      {(cs.tempo ?? cs.song.tempo) != null && (
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                          {cs.tempo ?? cs.song.tempo} BPM
                        </span>
                      )}
                      {(cs.sheets.length > 0 || cs.song.sheetMusicUrl) && (
                        <button
                          onClick={() => setExpandedSheetId(sheetOpen ? null : cs.id)}
                          className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                        >
                          {sheetOpen ? '악보 닫기' : cs.sheets.length > 0 ? `악보보기 ${cs.sheets.length}장` : '악보보기'}
                        </button>
                      )}
                      <button
                        onClick={() => { sheetTargetContiSongId.current = cs.id; sheetInputRef.current?.click(); }}
                        disabled={uploadingSheetId === cs.id}
                        className="print:hidden rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-500 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-400"
                      >
                        {uploadingSheetId === cs.id ? '...' : '+ 악보'}
                      </button>
                    </div>
                    {cs.song.artist && <p className="mt-0.5 text-xs text-gray-400">{cs.song.artist}</p>}
                    {cs.note && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{cs.note}</p>}
                  </div>
                  <div className="print:hidden flex shrink-0 items-center gap-0.5 sm:gap-1">
                    <button onClick={() => onMove(index, 'up')} disabled={index === 0} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20 dark:hover:bg-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button onClick={() => onMove(index, 'down')} disabled={index === conti.songs.length - 1} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20 dark:hover:bg-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button onClick={() => onEditSong(cs)} className="rounded p-1.5 text-gray-400 hover:bg-violet-50 hover:text-violet-500 dark:hover:bg-violet-900/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => onRemoveSong(cs.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {sheetOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {cs.sheets.length > 0 ? (
                      cs.sheets.map((sheet, si) => {
                        const isPdf = sheet.url.toLowerCase().includes('.pdf');
                        return (
                          <div key={sheet.id} className={si > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}>
                            <div className="print:hidden flex items-center justify-between px-4 py-1.5">
                              <span className="text-xs text-gray-400">악보보기 {si + 1}장</span>
                              <button onClick={() => handleSheetDelete(cs.id, sheet.id)} className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                                삭제
                              </button>
                            </div>
                            {isPdf ? (
                              <iframe src={sheet.url} className="h-[70vh] w-full rounded-b-xl sm:h-[80vh]" title={`${cs.song.title} 악보 ${si + 1}`} />
                            ) : (
                              <div className="flex justify-center p-4">
                                <img src={sheet.url} alt={`${cs.song.title} 악보 ${si + 1}`} className="max-w-full rounded-lg object-contain" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : cs.song.sheetMusicUrl ? (
                      <div>
                        <div className="print:hidden flex items-center px-4 py-1.5">
                          <span className="text-xs text-gray-400">악보보기</span>
                        </div>
                        {cs.song.sheetMusicUrl.toLowerCase().includes('.pdf') ? (
                          <iframe src={cs.song.sheetMusicUrl} className="h-[70vh] w-full rounded-b-xl sm:h-[80vh]" title={`${cs.song.title} 악보보기`} />
                        ) : (
                          <div className="flex justify-center p-4">
                            <img src={cs.song.sheetMusicUrl} alt={`${cs.song.title} 악보보기`} className="max-w-full rounded-lg object-contain" />
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <input ref={sheetInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleSheetUpload} />
    </>
  );
}
