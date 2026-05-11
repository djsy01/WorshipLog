'use client';

import { useState, useCallback } from 'react';
import { Song, BibleVerse, SpotifyTrack, spotifyApi, bibleApi } from '@/lib/api';

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'];

function formatRef(v: BibleVerse) {
  return `${v.book} ${v.chapter}:${v.verse}`;
}

interface SongsFormModalProps {
  show: boolean;
  editingSong: Song | null;
  token: string;
  verse: BibleVerse | null;
  onClose: () => void;
  onSave: (isEdit: boolean) => Promise<void>;
  form: {
    title: string;
    artist: string;
    defaultKey: string;
    tempo: string;
    lyrics: string;
    scriptureRef: string;
    isPublic: boolean;
  };
  onFormChange: (field: string, value: any) => void;
  saving: boolean;
  sheetFile: File | null;
  onSheetFileChange: (file: File | null) => void;
  onSheetRemove: () => Promise<void>;
  sheetRemoving: boolean;
  isAdmin?: boolean;
}

export function SongsFormModal({
  show,
  editingSong,
  token,
  verse,
  onClose,
  onSave,
  form,
  onFormChange,
  saving,
  sheetFile,
  onSheetFileChange,
  onSheetRemove,
  sheetRemoving,
  isAdmin = false,
}: SongsFormModalProps) {
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [showVersePicker, setShowVersePicker] = useState(false);
  const [pickerVerses, setPickerVerses] = useState<BibleVerse[]>([]);

  const handleSpotifySearch = async () => {
    if (!token || !spotifyQuery.trim()) return;
    setSpotifyLoading(true);
    setSpotifyResults([]);
    try {
      const data = await spotifyApi.search(token, spotifyQuery.trim());
      setSpotifyResults(data);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSpotifyLoading(false);
    }
  };

  const applySpotifyTrack = (track: SpotifyTrack) => {
    onFormChange('title', track.title);
    onFormChange('artist', track.artist);
    if (track.tempo) onFormChange('tempo', String(track.tempo));
    setSpotifyResults([]);
    setSpotifyQuery('');
  };

  const handlePickerInput = useCallback(
    async (val: string) => {
      onFormChange('scriptureRef', val);
      setShowVersePicker(true);
      if (!val.trim()) {
        setPickerVerses([]);
        return;
      }
      if (!token) return;
      try {
        const results = await bibleApi.searchByRef(token, val);
        setPickerVerses(results);
      } catch {
        setPickerVerses([]);
      }
    },
    [token, onFormChange],
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">{editingSong ? '찬양 수정' : '새 찬양 추가'}</h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-400">🎵 곡 검색으로 가져오기</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="곡명 검색..."
                value={spotifyQuery}
                onChange={(e) => setSpotifyQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()}
                className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-blue-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                onClick={handleSpotifySearch}
                disabled={spotifyLoading || !spotifyQuery.trim()}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {spotifyLoading ? '...' : '검색'}
              </button>
            </div>
            {spotifyResults.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-blue-200 bg-white dark:border-blue-700 dark:bg-gray-800">
                {spotifyResults.map((track) => (
                  <li key={track.id}>
                    <button
                      onMouseDown={() => applySpotifyTrack(track)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{track.title}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{track.artist}</p>
                      </div>
                      {track.tempo && <span className="shrink-0 text-xs text-gray-400">♩ {track.tempo}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <input
            type="text"
            placeholder="곡명 *"
            value={form.title}
            onChange={(e) => onFormChange('title', e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
          />
          <input
            type="text"
            placeholder="아티스트 / 찬양팀 *"
            value={form.artist}
            onChange={(e) => onFormChange('artist', e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
          />
          <div className="flex gap-3">
            <select
              value={form.defaultKey}
              onChange={(e) => onFormChange('defaultKey', e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
            >
              <option value="">키 선택</option>
              {KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="BPM"
              value={form.tempo}
              onChange={(e) => onFormChange('tempo', e.target.value)}
              className="w-24 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
            />
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="말씀 구절 (예: 시 23:1, 엡 2:21-22)"
              value={form.scriptureRef}
              onChange={(e) => handlePickerInput(e.target.value)}
              onFocus={() => setShowVersePicker(true)}
              onBlur={() => setTimeout(() => setShowVersePicker(false), 200)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-amber-500"
            />
            {showVersePicker &&
              (() => {
                const todayRef = verse ? formatRef(verse) : null;
                const showToday = todayRef && !form.scriptureRef;
                const hasResults = pickerVerses.length > 0;
                if (!showToday && !hasResults) return null;
                return (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {showToday && (
                      <button
                        onMouseDown={() => {
                          onFormChange('scriptureRef', todayRef!);
                          setShowVersePicker(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-violet-50 dark:text-gray-300 dark:hover:bg-violet-900/20"
                      >
                        <span className="text-amber-500">📖</span>
                        <span className="font-medium">{todayRef}</span>
                        <span className="ml-auto text-xs text-gray-400">오늘의 말씀</span>
                      </button>
                    )}
                    {hasResults &&
                      pickerVerses.map((v) => (
                        <button
                          key={`${v.book}${v.chapter}:${v.verse}`}
                          onMouseDown={() => {
                            onFormChange('scriptureRef', `${v.book} ${v.chapter}:${v.verse}`);
                            setShowVersePicker(false);
                          }}
                          className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                              {v.book} {v.chapter}:{v.verse}
                            </span>
                          </div>
                          <p className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{v.content}</p>
                        </button>
                      ))}
                  </div>
                );
              })()}
          </div>

          <textarea
            placeholder="가사 (선택)"
            value={form.lyrics}
            onChange={(e) => onFormChange('lyrics', e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
          />

          {/* 악보 */}
          {isAdmin ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">악보 (PDF / 이미지)</p>
              {editingSong?.sheetMusicUrl && !sheetFile && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <a
                    href={editingSong.sheetMusicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    현재 악보 보기
                  </a>
                  <button
                    type="button"
                    onClick={onSheetRemove}
                    disabled={sheetRemoving}
                    className="shrink-0 text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    {sheetRemoving ? '...' : '삭제'}
                  </button>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-400 transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5" />
                  <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z" />
                </svg>
                {sheetFile ? sheetFile.name : editingSong?.sheetMusicUrl ? '악보 교체' : '악보 업로드'}
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => onSheetFileChange(e.target.files?.[0] ?? null)} />
              </label>
              {sheetFile && (
                <button type="button" onClick={() => onSheetFileChange(null)} className="text-xs text-gray-400 hover:text-gray-600">
                  선택 취소
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500">악보 업로드는 관리자만 가능합니다.</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            취소
          </button>
          <button
            onClick={() => onSave(!!editingSong)}
            disabled={!form.title.trim() || !form.artist.trim() || saving}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : editingSong ? '수정하기' : '추가하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
