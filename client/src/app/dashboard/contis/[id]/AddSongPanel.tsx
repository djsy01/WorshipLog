'use client';

import { useCallback, useEffect, useState } from 'react';
import { songsApi, contisApi, bibleApi, type Song, type BibleVerse } from '@/lib/api';
import { SongsFormModal } from '@/app/dashboard/songs/SongsFormModal';

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'];
const EMPTY_FORM = { title: '', artist: '', defaultKey: '', tempo: '', lyrics: '', scriptureRef: '', isPublic: true };

interface Props {
  contiId: string;
  token: string;
  addedSongIds: Set<string>;
  onAdd: () => void;
  onClose: () => void;
}

export default function AddSongPanel({ contiId, token, addedSongIds, onAdd, onClose }: Props) {
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [addingKey, setAddingKey] = useState('');
  const [addingNote, setAddingNote] = useState('');
  const [adding, setAdding] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [verse, setVerse] = useState<BibleVerse | null>(null);


  const loadSongs = useCallback(async () => {
    setLoadingSongs(true);
    try {
      setAllSongs(await songsApi.list(token));
    } finally {
      setLoadingSongs(false);
    }
  }, [token]);

  useEffect(() => { loadSongs(); }, [loadSongs]);
  useEffect(() => { if (token) bibleApi.today(token).then(setVerse).catch(() => null); }, [token]);

  const handleAdd = async () => {
    if (!selectedSong) return;
    setAdding(true);
    try {
      await contisApi.addSong(token, contiId, {
        songId: selectedSong.id,
        key: addingKey || undefined,
        note: addingNote.trim() || undefined,
      });
      onAdd();
      onClose();
    } finally {
      setAdding(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.artist.trim()) return;
    setSaving(true);
    try {
      const created = await songsApi.create(token, {
        title: form.title.trim(),
        artist: form.artist || null,
        defaultKey: form.defaultKey || null,
        tempo: form.tempo ? Number(form.tempo) : null,
        lyrics: form.lyrics || null,
        scriptureRef: form.scriptureRef || null,
        isPublic: true,
      });
      if (sheetFile) await songsApi.uploadSheet(token, created.id, sheetFile);
      const songs = await songsApi.list(token);
      setAllSongs(songs);
      setSelectedSong(created);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setSheetFile(null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = allSongs.filter((s) => {
    const q = songSearch.toLowerCase();
    return s.title.toLowerCase().includes(q) || (s.artist?.toLowerCase().includes(q) ?? false);
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
        <div className="flex h-[80vh] w-full flex-col rounded-t-2xl bg-white dark:bg-gray-900 sm:h-auto sm:max-h-[80vh] sm:max-w-lg sm:rounded-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="font-bold text-gray-900 dark:text-white">찬양 추가</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-600 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                새 찬양 등록
              </button>
              <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <input
              type="text"
              value={songSearch}
              onChange={(e) => setSongSearch(e.target.value)}
              placeholder="곡명, 아티스트 검색"
              className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              autoFocus
            />
            <div className="space-y-1">
              {loadingSongs ? (
                <p className="py-4 text-center text-sm text-gray-400">불러오는 중...</p>
              ) : filtered.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="mb-4 text-sm text-gray-400">{songSearch ? '검색 결과가 없습니다.' : '등록된 찬양이 없습니다.'}</p>
                  <button
                    onClick={() => {
                      setForm({ ...EMPTY_FORM, title: songSearch });
                      setShowCreate(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    "{songSearch || '새 찬양'}" 등록하기
                  </button>
                </div>
              ) : (
                filtered.map((song) => {
                  const alreadyAdded = addedSongIds.has(song.id);
                  return (
                    <button
                      key={song.id}
                      onClick={() => !alreadyAdded && setSelectedSong(song)}
                      disabled={alreadyAdded}
                      className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                        selectedSong?.id === song.id
                          ? 'bg-violet-50 ring-1 ring-violet-400 dark:bg-violet-900/30'
                          : alreadyAdded
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{song.title}</span>
                          {song.artist && <span className="ml-2 text-xs text-gray-400">{song.artist}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {song.defaultKey && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">{song.defaultKey}</span>
                          )}
                          {alreadyAdded && <span className="text-xs text-gray-400">추가됨</span>}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {selectedSong && (
              <div className="mt-4 rounded-xl bg-violet-50 p-4 dark:bg-violet-900/20">
                <p className="mb-3 text-sm font-semibold text-violet-700 dark:text-violet-400">&ldquo;{selectedSong.title}&rdquo; 설정</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500">이 콘티에서 사용할 키</label>
                    <select
                      value={addingKey}
                      onChange={(e) => setAddingKey(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">기본 ({selectedSong.defaultKey ?? '없음'})</option>
                      {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500">송폼</label>
                    <input
                      type="text"
                      value={addingNote}
                      onChange={(e) => setAddingNote(e.target.value)}
                      placeholder="예) 간주 후 반복"
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 p-4 dark:border-gray-800">
            <button
              onClick={handleAdd}
              disabled={!selectedSong || adding}
              className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
            >
              {adding ? '추가 중...' : selectedSong ? `"${selectedSong.title}" 추가하기` : '곡을 선택하세요'}
            </button>
          </div>
        </div>
      </div>

      <SongsFormModal
        show={showCreate}
        editingSong={null}
        token={token}
        verse={verse}
        onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); setSheetFile(null); }}
        onSave={() => handleCreate()}
        isAdmin={true}
        form={form}
        onFormChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))}
        saving={saving}
        sheetFile={sheetFile}
        onSheetFileChange={setSheetFile}
        onSheetRemove={async () => {}}
        sheetRemoving={false}
      />
    </>
  );
}
