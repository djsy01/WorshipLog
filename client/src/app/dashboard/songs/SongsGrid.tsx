'use client';

import { useState, useEffect } from 'react';
import type { Song } from '@/lib/api';

interface Props {
  songs: Song[];
  loading: boolean;
  error: string;
  search: string;
  onSearchChange: (v: string) => void;
  selectedCat: string | null;
  token: string;
  onSelectSong: (s: Song) => void;
  onAddSong: () => void;
}

const PAGE_SIZE = 20;

export default function SongsGrid({ songs, loading, error, search, onSearchChange, selectedCat, token, onSelectSong, onAddSong }: Props) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [songs]);

  const totalPages = Math.ceil(songs.length / PAGE_SIZE);
  const paged = songs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">찬양 목록</h1>
        {token && (
          <button onClick={onAddSong} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700">
            + 찬양 추가
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="곡명, 아티스트, 말씀 구절(시 23:1)로 검색..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-violet-500 dark:focus:ring-violet-900/30"
        />
      </div>

      {search && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">검색어:</span>
          <span className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-0.5 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            {search}
            <button onClick={() => onSearchChange('')} className="ml-1 text-violet-400 hover:text-violet-600">×</button>
          </span>
        </div>
      )}

      {loading && <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">불러오는 중...</div>}
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
      {!loading && !error && songs.length === 0 && (
        <div className="py-16 text-center">
          <p className="mb-1 text-gray-500 dark:text-gray-400">
            {search ? `"${search}"에 해당하는 찬양이 없습니다.` : selectedCat ? `'${selectedCat}'으로 시작하는 찬양이 없습니다.` : '찬양이 없습니다.'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-600">
            {search ? '다른 키워드로 검색하거나 직접 추가해보세요.' : '첫 번째 찬양을 추가해보세요!'}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {paged.map((song) => (
          <button key={song.id} onClick={() => onSelectSong(song)} className="group rounded-xl bg-white p-5 text-left shadow-sm ring-1 ring-gray-200 transition hover:ring-violet-300 dark:bg-gray-900 dark:ring-gray-700 dark:hover:ring-violet-600">
            <h3 className="truncate font-semibold text-gray-900 dark:text-white">{song.title}</h3>
            {song.artist && <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{song.artist}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {song.defaultKey && (
                <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{song.defaultKey}</span>
              )}
              {song.tempo && (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">♩ {song.tempo} BPM</span>
              )}
              {song.scriptureRef && (
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">📖 {song.scriptureRef}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition hover:border-violet-300 hover:text-violet-600 disabled:opacity-30 dark:border-gray-700 dark:text-gray-400">
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`e-${i}`} className="px-1 text-sm text-gray-400">…</span>
              ) : (
                <button key={p} onClick={() => setPage(p as number)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${page === p ? 'bg-violet-600 text-white' : 'border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:text-gray-400'}`}>
                  {p}
                </button>
              )
            )}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition hover:border-violet-300 hover:text-violet-600 disabled:opacity-30 dark:border-gray-700 dark:text-gray-400">
            다음
          </button>
        </div>
      )}
    </div>
  );
}
