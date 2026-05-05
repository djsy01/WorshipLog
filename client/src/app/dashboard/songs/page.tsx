'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { songsApi, bibleApi, spotifyApi, Song, BibleVerse, SpotifyTrack } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
               'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'];

const CAT_SECTIONS = [
  { key: 'ko', label: '한글', items: ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅎ'] },
  { key: 'en', label: '영어', items: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'] },
];

const CHO_TO_CAT: Record<number, string> = {
  0:'ㄱ',1:'ㄱ',2:'ㄴ',3:'ㄷ',4:'ㄷ',5:'ㄹ',6:'ㅁ',7:'ㅂ',8:'ㅂ',
  9:'ㅅ',10:'ㅅ',11:'ㅇ',12:'ㅈ',13:'ㅈ',14:'ㅊ',15:'ㅊ',16:'ㅊ',17:'ㅊ',18:'ㅎ',
};

function getSongCategory(title: string): string | null {
  if (!title) return null;
  const code = title.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return CHO_TO_CAT[Math.floor((code - 0xAC00) / (21 * 28))] ?? null;
  }
  const upper = title[0].toUpperCase();
  if (upper >= 'A' && upper <= 'Z') return upper;
  return null;
}

function SidebarContent({ selected, onSelect }: { selected: string | null; onSelect: (cat: string | null) => void }) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ ko: true, en: false });
  return (
    <nav className="py-3">
      <button
        onClick={() => onSelect(null)}
        className={`w-full text-left px-5 py-2 text-sm transition ${
          selected === null
            ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-semibold border-r-2 border-violet-500'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        전체
      </button>
      {CAT_SECTIONS.map((section) => (
        <div key={section.key} className="mb-1">
          <button
            onClick={() => setOpenSections((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <span>{section.label}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16"
              className={`transition-transform ${openSections[section.key] ? '' : '-rotate-90'}`}>
              <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708" />
            </svg>
          </button>
          {openSections[section.key] && (
            <ul>
              {section.items.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => onSelect(selected === cat ? null : cat)}
                    className={`w-full text-left px-5 py-2 text-sm transition ${
                      selected === cat
                        ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-semibold border-r-2 border-violet-500'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}

function formatRef(v: BibleVerse) {
  return `${v.book} ${v.chapter}:${v.verse}`;
}

function SongsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('');

  // 찬양 추가 / 수정 모달
  const [showModal, setShowModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [form, setForm] = useState({
    title: '',
    artist: '',
    defaultKey: '',
    tempo: '',
    lyrics: '',
    scriptureRef: '',
    isPublic: true,
  });
  const [saving, setSaving] = useState(false);

  // Spotify 검색 (모달 내)
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [spotifyLoading, setSpotifyLoading] = useState(false);

  // 카테고리 필터
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 카드 expand
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 페이지네이션
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  // 말씀 구절 피커 (모달 내)
  const [showVersePicker, setShowVersePicker] = useState(false);
  const [pickerVerses, setPickerVerses] = useState<BibleVerse[]>([]);

  const fetchSongs = useCallback(async (q?: string) => {
    setLoading(true);
    setError('');
    try {
      const t = localStorage.getItem('accessToken') ?? '';
      const data = await songsApi.list(t, q);
      setSongs(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('accessToken') ?? '';
    setToken(t);
    if (t) {
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        setUserId(payload.sub ?? '');
        setUserRole(payload.role ?? 'user');
      } catch { /* invalid token */ }
    }
    fetchSongs();
    if (t) {
      bibleApi.today(t).then(setVerse).catch(() => null);
    } else {
      bibleApi.publicRandom().then(setVerse).catch(() => null);
    }
  }, [fetchSongs]);

  // 검색 디바운스
  useEffect(() => {
    setPage(1);
    const t = setTimeout(() => fetchSongs(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search, fetchSongs]);

  // 카테고리 변경 시 페이지 리셋
  useEffect(() => { setPage(1); }, [selectedCat]);

  const handleVerseSearch = () => {
    if (!verse) return;
    setSearch(formatRef(verse));
  };

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
    setForm((f) => ({
      ...f,
      title: track.title,
      artist: track.artist,
      tempo: track.tempo ? String(track.tempo) : f.tempo,
    }));
    setSpotifyResults([]);
    setSpotifyQuery('');
  };

  const handleCreate = async () => {
    if (!token || !form.title.trim() || !form.artist.trim()) return;
    setSaving(true);
    try {
      await songsApi.create(token, {
        title: form.title.trim(),
        artist: form.artist || null,
        defaultKey: form.defaultKey || null,
        tempo: form.tempo ? Number(form.tempo) : null,
        lyrics: form.lyrics || null,
        scriptureRef: form.scriptureRef || null,
        isPublic: true,
      });
      closeModal();
      fetchSongs(search || undefined);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
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

  const closeModal = () => {
    setShowModal(false);
    setEditingSong(null);
    setForm({ title: '', artist: '', defaultKey: '', tempo: '', lyrics: '', scriptureRef: '', isPublic: true });
    setShowVersePicker(false);
    setSpotifyQuery('');
    setSpotifyResults([]);
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
      closeModal();
      fetchSongs(search || undefined);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
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

  const handlePickerInput = useCallback(async (val: string) => {
    setForm((f) => ({ ...f, scriptureRef: val }));
    setShowVersePicker(true);
    if (!val.trim()) { setPickerVerses([]); return; }
    if (!token) return;
    try {
      const results = await bibleApi.searchByRef(token, val);
      setPickerVerses(results);
    } catch { setPickerVerses([]); }
  }, [token]);

  const filteredSongs = selectedCat
    ? songs.filter((s) => getSongCategory(s.title) === selectedCat)
    : songs;

  const totalPages = Math.ceil(filteredSongs.length / PAGE_SIZE);
  const pagedSongs = filteredSongs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

        {/* 오늘의 말씀 카드 */}
        <div className="mb-6 rounded-2xl bg-violet-100 px-8 py-6 dark:bg-violet-700/20">
          {verse ? (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-800 dark:text-violet-500">
                  오늘의 말씀
                </p>
                <p className="font-lovespring text-lg text-gray-800 dark:text-gray-200">{verse.content}</p>
                <p className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400">
                  {formatRef(verse)}
                </p>
              </div>
              <button
                onClick={handleVerseSearch}
                className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 whitespace-nowrap"
              >
                이 말씀으로<br />찬양 찾기
              </button>
            </div>
          ) : (
            <div className="animate-pulse space-y-2">
              <div className="h-3 w-20 rounded bg-violet-200 dark:bg-violet-700/40" />
              <div className="h-7 w-3/4 rounded bg-violet-200 dark:bg-violet-700/40" />
              <div className="h-5 w-1/4 rounded bg-violet-200 dark:bg-violet-700/40" />
            </div>
          )}
        </div>

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
          {/* 데스크탑 사이드바 */}
          <aside className="hidden md:block w-52 shrink-0 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 self-start sticky top-20">
            <SidebarContent selected={selectedCat} onSelect={setSelectedCat} />
          </aside>

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {/* 모바일 상단 바 */}
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

            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">찬양 목록</h1>
              {token && (
                <button
                  onClick={() => { setEditingSong(null); setShowModal(true); }}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  + 찬양 추가
                </button>
              )}
            </div>

            {/* 검색 */}
            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="곡명, 아티스트, 말씀 구절(시 23:1)로 검색..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-violet-500 dark:focus:ring-violet-900/30"
              />
            </div>

            {search && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">검색어:</span>
                <span className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-0.5 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {search}
                  <button onClick={() => setSearch('')} className="ml-1 text-violet-400 hover:text-violet-600">×</button>
                </span>
              </div>
            )}

            {loading && (
              <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">불러오는 중...</div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
            )}
            {!loading && !error && filteredSongs.length === 0 && (
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
              {pagedSongs.map((song) => {
                const isExpanded = expandedId === song.id;
                return (
                  <div
                    key={song.id}
                    className="group relative rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition dark:bg-gray-900 dark:ring-gray-700"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : song.id)}
                      className="w-full p-5 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-gray-900 dark:text-white">{song.title}</h3>
                          {song.artist && (
                            <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{song.artist}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {song.defaultKey && (
                              <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                {song.defaultKey}
                              </span>
                            )}
                            {song.tempo && (
                              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                ♩ {song.tempo} BPM
                              </span>
                            )}
                            {song.scriptureRef && (
                              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                📖 {song.scriptureRef}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-4 w-4 shrink-0 text-gray-300 transition-transform dark:text-gray-600 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 pb-4 dark:border-gray-800">
                        {song.lyrics && (
                          <div className="mt-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">가사</p>
                            <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                              {song.lyrics}
                            </p>
                          </div>
                        )}
                        {song.scriptureRef && (
                          <button
                            onClick={() => setSearch(song.scriptureRef!)}
                            className="mt-3 text-xs text-amber-600 hover:underline dark:text-amber-400"
                          >
                            📖 {song.scriptureRef} 로 찬양 찾기
                          </button>
                        )}
                        {token && (userRole === 'admin' || song.createdBy === userId) && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(song)}
                              className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-violet-400 hover:text-violet-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-violet-500 dark:hover:text-violet-400"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(song.id, song.title)}
                              className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400 hover:border-red-300 hover:text-red-500 dark:border-gray-700 dark:hover:border-red-700 dark:hover:text-red-400"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition hover:border-violet-300 hover:text-violet-600 disabled:opacity-30 dark:border-gray-700 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
                >
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
                      <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          page === p
                            ? 'bg-violet-600 text-white'
                            : 'border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition hover:border-violet-300 hover:text-violet-600 disabled:opacity-30 dark:border-gray-700 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 찬양 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">
              {editingSong ? '찬양 수정' : '새 찬양 추가'}
            </h2>

            <div className="space-y-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                  🎵 곡 검색으로 가져오기
                </p>
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
                          {track.tempo && (
                            <span className="shrink-0 text-xs text-gray-400">♩ {track.tempo}</span>
                          )}
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
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
              />
              <input
                type="text"
                placeholder="아티스트 / 찬양팀 *"
                value={form.artist}
                onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
              />
              <div className="flex gap-3">
                <select
                  value={form.defaultKey}
                  onChange={(e) => setForm((f) => ({ ...f, defaultKey: e.target.value }))}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
                >
                  <option value="">키 선택</option>
                  {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <input
                  type="number"
                  placeholder="BPM"
                  value={form.tempo}
                  onChange={(e) => setForm((f) => ({ ...f, tempo: e.target.value }))}
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
                {showVersePicker && (
                  (() => {
                    const todayRef = verse ? formatRef(verse) : null;
                    const showToday = todayRef && !form.scriptureRef;
                    const hasResults = pickerVerses.length > 0;
                    if (!showToday && !hasResults) return null;
                    return (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        {showToday && (
                          <button
                            onMouseDown={() => { setForm((f) => ({ ...f, scriptureRef: todayRef! })); setShowVersePicker(false); }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-violet-50 dark:text-gray-300 dark:hover:bg-violet-900/20"
                          >
                            <span className="text-amber-500">📖</span>
                            <span className="font-medium">{todayRef}</span>
                            <span className="ml-auto text-xs text-gray-400">오늘의 말씀</span>
                          </button>
                        )}
                        {hasResults && pickerVerses.map((v) => (
                          <button
                            key={`${v.book}${v.chapter}:${v.verse}`}
                            onMouseDown={() => { setForm((f) => ({ ...f, scriptureRef: `${v.book} ${v.chapter}:${v.verse}` })); setShowVersePicker(false); }}
                            className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{v.book} {v.chapter}:{v.verse}</span>
                            </div>
                            <p className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{v.content}</p>
                          </button>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>

              <textarea
                placeholder="가사 (선택)"
                value={form.lyrics}
                onChange={(e) => setForm((f) => ({ ...f, lyrics: e.target.value }))}
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                취소
              </button>
              <button
                onClick={editingSong ? handleUpdate : handleCreate}
                disabled={!form.title.trim() || !form.artist.trim() || saving}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? '저장 중...' : editingSong ? '수정하기' : '추가하기'}
              </button>
            </div>
          </div>
        </div>
      )}
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
