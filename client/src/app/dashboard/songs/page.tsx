'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { songsApi, bibleApi, Song, BibleVerse } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import { useAccessToken } from '@/lib/stored-user';
import { readTokenClaims } from '@/lib/token-claims';
import { SidebarContent } from './SongsSidebar';
import { SongsDetailModal } from './SongsDetailModal';
import { SongsFormModal } from './SongsFormModal';
import SongsVerseCard from './SongsVerseCard';
import SongsGrid from './SongsGrid';
import { emptySongForm, type SongFormChange } from './song-form';
import { getSongCategory } from './song-category';

function formatRef(v: BibleVerse) {
  return `${v.book} ${v.chapter}:${v.verse}`;
}

function SongsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const storedToken = useAccessToken();
  const token = storedToken ?? '';
  const claims = readTokenClaims(token);
  const userId = claims?.userId ?? '';
  const userRole = claims?.role ?? '';

  const [showModal, setShowModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [form, setForm] = useState(emptySongForm);
  const [saving, setSaving] = useState(false);
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [sheetRemoving, setSheetRemoving] = useState(false);

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailSong, setDetailSong] = useState<Song | null>(null);

  const loadSongs = useCallback((q?: string) => {
    const t = localStorage.getItem('accessToken') ?? '';
    return songsApi.list(t, q)
      .then(setSongs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fetchSongs = useCallback((q?: string) => {
    setLoading(true);
    setError('');
    return loadSongs(q);
  }, [loadSongs]);

  useEffect(() => {
    if (storedToken === undefined) return;
    loadSongs();
    const verseRequest = storedToken ? bibleApi.today(storedToken) : bibleApi.publicRandom();
    verseRequest.then(setVerse).catch(() => null);
  }, [loadSongs, storedToken]);

  useEffect(() => {
    const t = setTimeout(() => fetchSongs(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search, fetchSongs]);

  const closeModal = () => {
    setShowModal(false);
    setEditingSong(null);
    setForm(emptySongForm);
    setSheetFile(null);
  };

  const handleCreate = async () => {
    if (!token || !form.title.trim() || !form.artist.trim()) return;
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
      closeModal();
      fetchSongs(search || undefined);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSong || !token || !form.title.trim() || !form.artist.trim()) return;
    setSaving(true);
    try {
      await songsApi.update(token, editingSong.id, {
        title: form.title.trim(),
        artist: form.artist || undefined,
        defaultKey: form.defaultKey || undefined,
        tempo: form.tempo ? Number(form.tempo) : undefined,
        lyrics: form.lyrics || undefined,
        scriptureRef: form.scriptureRef || undefined,
        isPublic: true,
      });
      if (sheetFile) await songsApi.uploadSheet(token, editingSong.id, sheetFile);
      closeModal();
      fetchSongs(search || undefined);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSheetRemove = async () => {
    if (!editingSong || !token) return;
    setSheetRemoving(true);
    try {
      const updated = await songsApi.deleteSheet(token, editingSong.id);
      setEditingSong(updated);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSheetRemoving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 을(를) 삭제하시겠습니까?`)) return;
    if (!token) return;
    try {
      await songsApi.remove(token, id);
      setSongs((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const openEditModal = (song: Song) => {
    setEditingSong(song);
    setForm({
      title: song.title,
      artist: song.artist ?? '',
      defaultKey: song.defaultKey ?? '',
      tempo: song.tempo ? String(song.tempo) : '',
      lyrics: song.lyrics ?? '',
      scriptureRef: song.scriptureRef ?? '',
      isPublic: song.isPublic ?? false,
    });
    setShowModal(true);
  };

  const handleFormChange: SongFormChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSave = async (isEdit: boolean) => {
    if (isEdit) await handleUpdate();
    else await handleCreate();
  };

  const filteredSongs = selectedCat
    ? songs.filter((s) => getSongCategory(s.title) === selectedCat)
    : songs;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader page="찬양 검색" />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-6 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/>
          </svg>
          대시보드로 돌아가기
        </button>

        <SongsVerseCard verse={verse} onSearch={() => verse && setSearch(formatRef(verse))} />

        {/* 모바일 드로어 */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed top-0 left-0 h-full w-64 z-40 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto md:hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <span className="font-semibold text-gray-900 dark:text-white text-sm">찬양 검색</span>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
                  </svg>
                </button>
              </div>
              <SidebarContent selected={selectedCat} onSelect={(cat) => { setSelectedCat(cat); setSidebarOpen(false); }} />
            </aside>
          </>
        )}

        <div className="flex gap-6">
          <aside className="hidden md:block w-52 shrink-0 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 self-start sticky top-20">
            <SidebarContent selected={selectedCat} onSelect={setSelectedCat} />
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-5 md:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {selectedCat ?? '전체'}
              </span>
            </div>

            <SongsGrid
              songs={filteredSongs}
              loading={loading}
              error={error}
              search={search}
              onSearchChange={setSearch}
              selectedCat={selectedCat}
              token={token}
              onSelectSong={setDetailSong}
              onAddSong={() => { setEditingSong(null); setShowModal(true); }}
            />
          </div>
        </div>
      </main>

      <SongsDetailModal
        song={detailSong}
        onClose={() => setDetailSong(null)}
        onEdit={openEditModal}
        onDelete={handleDelete}
        userId={userId}
        userRole={userRole}
        token={token}
      />

      <SongsFormModal
        show={showModal}
        editingSong={editingSong}
        token={token}
        verse={verse}
        onClose={closeModal}
        onSave={handleSave}
        form={form}
        onFormChange={handleFormChange}
        saving={saving}
        sheetFile={sheetFile}
        onSheetFileChange={setSheetFile}
        onSheetRemove={handleSheetRemove}
        sheetRemoving={sheetRemoving}
        isAdmin={userRole === 'admin'}
      />
    </div>
  );
}

export default function SongsPage() {
  return (
    <Suspense>
      <SongsContent />
    </Suspense>
  );
}
