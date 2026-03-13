'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { songsApi, bibleApi, spotifyApi, Song, BibleVerse, SpotifyTrack } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
               'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'];

// 구절 레퍼런스 포맷: "시 23:1"
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

  // 카드 expand
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 말씀 구절 피커 (모달 내)
  const [showVersePicker, setShowVersePicker] = useState(false);
  const [pickerVerses, setPickerVerses] = useState<BibleVerse[]>([]);

  const getToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return null; }
    return token;
  }, [router]);

  const fetchSongs = useCallback(async (q?: string) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await songsApi.list(token, q);
      setSongs(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!localStorage.getItem('user')) { router.replace('/login'); return; }
    const token = localStorage.getItem('accessToken') ?? '';
    fetchSongs();
    bibleApi.today(token).then(setVerse).catch(() => null);
  }, [fetchSongs, router]);

  // 검색 디바운스
  useEffect(() => {
    const t = setTimeout(() => fetchSongs(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search, fetchSongs]);

  // "이 말씀으로 찬양 찾기" → 구절 참조(시 23:1)로 검색
  const handleVerseSearch = () => {
    if (!verse) return;
    setSearch(formatRef(verse));
  };

  const handleSpotifySearch = async () => {
    const token = getToken();
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
    const token = getToken();
    if (!token || !form.title.trim()) return;
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
    if (!editingSong) return;
    const token = getToken();
    if (!token || !form.title.trim()) return;
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
    const token = getToken();
    if (!token) return;
    try {
      await songsApi.remove(token, id);
      setSongs((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  // 구절 피커: 오늘의 말씀 + 입력한 ref로 bible 검색
  const handlePickerInput = useCallback(async (val: string) => {
    setForm((f) => ({ ...f, scriptureRef: val }));
    setShowVersePicker(true);
    if (!val.trim()) { setPickerVerses([]); return; }
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const results = await bibleApi.searchByRef(token, val);
      setPickerVerses(results);
    } catch { setPickerVerses([]); }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader page="찬양 검색" />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* 뒤로가기 버튼 */}
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
        {verse && (
          <div className="mb-6 rounded-xl bg-violet-50 p-5 dark:bg-violet-900/20">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-400 dark:text-violet-500">
                  오늘의 말씀
                </p>
                <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">{verse.content}</p>
                <p className="mt-1.5 text-xs font-medium text-violet-500 dark:text-violet-400">
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
          </div>
        )}

        {/* 페이지 타이틀 */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">찬양 목록</h1>
        </div>

        {/* 검색 + 추가 버튼 */}
        <div className="mb-6 flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="곡명, 아티스트, 말씀 구절(시 23:1)로 검색..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-violet-500 dark:focus:ring-violet-900/30"
          />
          <button
            onClick={() => { setEditingSong(null); setShowModal(true); }}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            + 찬양 추가
          </button>
        </div>

        {/* 검색 중일 때 태그 표시 */}
        {search && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">검색어:</span>
            <span className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-0.5 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              {search}
              <button onClick={() => setSearch('')} className="ml-1 text-violet-400 hover:text-violet-600">×</button>
            </span>
          </div>
        )}

        {/* 목록 */}
        {loading && (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">불러오는 중...</div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
        )}
        {!loading && !error && songs.length === 0 && (
          <div className="py-16 text-center">
            <p className="mb-1 text-gray-500 dark:text-gray-400">
              {search ? `"${search}"에 해당하는 찬양이 없습니다.` : '찬양이 없습니다.'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-600">
              {search ? '다른 키워드로 검색하거나 직접 추가해보세요.' : '첫 번째 찬양을 추가해보세요!'}
            </p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {songs.map((song) => {
            const isExpanded = expandedId === song.id;
            return (
              <div
                key={song.id}
                className="group relative rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition dark:bg-gray-900 dark:ring-gray-700"
              >
                {/* 클릭 영역 - 헤더 */}
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
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            ♩ {song.tempo} BPM
                          </span>
                        )}
                        {song.scriptureRef && (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
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

                {/* 펼쳐지는 상세 영역 */}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* 찬양 추가 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">
              {editingSong ? '찬양 수정' : '새 찬양 추가'}
            </h2>

            <div className="space-y-3">
              {/* Spotify 검색 */}
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                <p className="mb-2 text-xs font-semibold text-green-700 dark:text-green-400">
                  🎵 Spotify에서 곡 가져오기
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="곡명 검색..."
                    value={spotifyQuery}
                    onChange={(e) => setSpotifyQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()}
                    className="flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 dark:border-green-700 dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    onClick={handleSpotifySearch}
                    disabled={spotifyLoading || !spotifyQuery.trim()}
                    className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    {spotifyLoading ? '...' : '검색'}
                  </button>
                </div>
                {spotifyResults.length > 0 && (
                  <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-green-200 bg-white dark:border-green-700 dark:bg-gray-800">
                    {spotifyResults.map((track) => (
                      <li key={track.id}>
                        <button
                          onMouseDown={() => applySpotifyTrack(track)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20"
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
                placeholder="아티스트 / 찬양팀"
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

              {/* 말씀 구절 입력 */}
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
                {/* 오늘의 말씀 빠른 선택 + 범위 구절 결과 */}
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
                disabled={!form.title.trim() || saving}
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
