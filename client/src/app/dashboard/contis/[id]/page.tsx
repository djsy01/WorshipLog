'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { contisApi, songsApi, Conti, ContiSong, Song } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'];

export default function ContiEditPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const contiId = params.id as string;

    const [conti, setConti] = useState<Conti | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // 제목/날짜 편집
    const [editingInfo, setEditingInfo] = useState(false);
    const [infoForm, setInfoForm] = useState({ title: '', description: '', worshipDate: '' });
    const [savingInfo, setSavingInfo] = useState(false);

    // 곡 추가 패널 (새 콘티 생성 직후엔 자동 오픈)
    const [showAddSong, setShowAddSong] = useState(searchParams.get('new') === 'true');
    const [allSongs, setAllSongs] = useState<Song[]>([]);
    const [songSearch, setSongSearch] = useState('');
    const [addingKey, setAddingKey] = useState('');
    const [addingNote, setAddingNote] = useState('');
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [addingSong, setAddingSong] = useState(false);

    // 곡 편집 (key/note)
    const [editingCs, setEditingCs] = useState<ContiSong | null>(null);
    const [editKey, setEditKey] = useState('');
    const [editNote, setEditNote] = useState('');
    const [savingCs, setSavingCs] = useState(false);

    const getToken = useCallback(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.replace('/login');
            return null;
        }
        return token;
    }, [router]);

    const loadConti = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const data = await contisApi.get(token, contiId);
            setConti(data);
            setInfoForm({
                title: data.title,
                description: data.description ?? '',
                worshipDate: data.worshipDate ? data.worshipDate.split('T')[0] : '',
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : '불러오기 실패');
        } finally {
            setLoading(false);
        }
    }, [getToken, contiId]);

    useEffect(() => {
        loadConti();
    }, [loadConti]);

    const loadSongs = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        const data = await songsApi.list(token);
        setAllSongs(data);
    }, [getToken]);

    const handleOpenAddSong = () => {
        setShowAddSong(true);
        if (allSongs.length === 0) loadSongs();
    };

    // 콘티 기본정보 저장
    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = getToken();
        if (!token || !conti) return;
        setSavingInfo(true);
        try {
            const updated = await contisApi.update(token, contiId, {
                title: infoForm.title.trim(),
                description: infoForm.description.trim() || undefined,
                worshipDate: infoForm.worshipDate || undefined,
            });
            setConti(updated);
            setEditingInfo(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : '저장 실패');
        } finally {
            setSavingInfo(false);
        }
    };

    // 곡 추가
    const handleAddSong = async () => {
        if (!selectedSong) return;
        const token = getToken();
        if (!token) return;
        setAddingSong(true);
        try {
            await contisApi.addSong(token, contiId, {
                songId: selectedSong.id,
                key: addingKey || undefined,
                note: addingNote.trim() || undefined,
            });
            await loadConti();
            setSelectedSong(null);
            setAddingKey('');
            setAddingNote('');
            setShowAddSong(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : '추가 실패');
        } finally {
            setAddingSong(false);
        }
    };

    // 곡 삭제
    const handleRemoveSong = async (contiSongId: string) => {
        const token = getToken();
        if (!token) return;
        try {
            await contisApi.removeSong(token, contiId, contiSongId);
            await loadConti();
        } catch (e) {
            setError(e instanceof Error ? e.message : '삭제 실패');
        }
    };

    // 순서 이동
    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (!conti) return;
        const token = getToken();
        if (!token) return;
        const songs = [...conti.songs];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= songs.length) return;
        [songs[index], songs[swapIndex]] = [songs[swapIndex], songs[index]];
        // 낙관적 업데이트
        setConti({ ...conti, songs });
        try {
            const updated = await contisApi.reorderSongs(
                token,
                contiId,
                songs.map((s) => s.id),
            );
            setConti(updated);
        } catch (e) {
            setError(e instanceof Error ? e.message : '순서 변경 실패');
            loadConti();
        }
    };

    // 곡 key/note 편집 저장
    const handleSaveCs = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCs) return;
        const token = getToken();
        if (!token) return;
        setSavingCs(true);
        try {
            await contisApi.updateSong(token, contiId, editingCs.id, {
                key: editKey || undefined,
                note: editNote.trim() || undefined,
            });
            await loadConti();
            setEditingCs(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : '저장 실패');
        } finally {
            setSavingCs(false);
        }
    };

    const filteredSongs = allSongs.filter((s) => {
        const q = songSearch.toLowerCase();
        return s.title.toLowerCase().includes(q) || (s.artist?.toLowerCase().includes(q) ?? false);
    });

    // 이미 추가된 곡 ID 목록
    const addedSongIds = new Set(conti?.songs.map((cs) => cs.songId));

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
                <AppHeader page="콘티 편집" />
                <div className="flex justify-center py-20 text-gray-400">불러오는 중...</div>
            </div>
        );
    }

    if (!conti) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
                <AppHeader page="콘티 편집" />
                <div className="flex justify-center py-20 text-red-400">{error || '콘티를 찾을 수 없습니다.'}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <AppHeader page="콘티 편집" />

            <main className="mx-auto max-w-3xl px-6 py-8">
                {/* 뒤로가기 */}
                <button
                    onClick={() => router.push('/dashboard/contis')}
                    className="mb-6 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path
                            fillRule="evenodd"
                            d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"
                        />
                    </svg>
                    콘티 목록으로 돌아가기
                </button>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        {error}
                        <button onClick={() => setError('')} className="ml-2 underline">
                            닫기
                        </button>
                    </div>
                )}

                {/* 콘티 기본정보 */}
                <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                    {editingInfo ? (
                        <form onSubmit={handleSaveInfo} className="space-y-3">
                            <input
                                type="text"
                                value={infoForm.title}
                                onChange={(e) => setInfoForm((f) => ({ ...f, title: e.target.value }))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                required
                            />
                            <input
                                type="date"
                                value={infoForm.worshipDate}
                                onChange={(e) => setInfoForm((f) => ({ ...f, worshipDate: e.target.value }))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            />
                            <textarea
                                value={infoForm.description}
                                onChange={(e) => setInfoForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="메모"
                                rows={2}
                                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingInfo(false)}
                                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingInfo}
                                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
                                >
                                    {savingInfo ? '저장 중...' : '저장'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{conti.title}</h1>
                                {conti.worshipDate && (
                                    <p className="mt-1 text-sm text-violet-500 dark:text-violet-400">
                                        {new Date(conti.worshipDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                )}
                                {conti.description && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{conti.description}</p>}
                            </div>
                            <button
                                onClick={() => setEditingInfo(true)}
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* 찬양 목록 */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                        찬양 목록 <span className="ml-1 text-sm font-normal text-gray-400">({conti.songs.length}곡)</span>
                    </h2>
                    <button
                        onClick={handleOpenAddSong}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                    >
                        + 찬양 추가
                    </button>
                </div>

                {conti.songs.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center dark:border-gray-700">
                        <p className="text-gray-400 dark:text-gray-500">아직 찬양이 없습니다.</p>
                        <button onClick={handleOpenAddSong} className="mt-2 text-sm font-medium text-violet-500 hover:underline">
                            찬양 추가하기
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {conti.songs.map((cs, index) => (
                            <div
                                key={cs.id}
                                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
                            >
                                {/* 순서 번호 */}
                                <span className="w-6 shrink-0 text-center text-sm font-bold text-gray-300 dark:text-gray-600">{index + 1}</span>

                                {/* 곡 정보 */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white">{cs.song.title}</span>
                                        {cs.key && (
                                            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                                {cs.key}
                                            </span>
                                        )}
                                        {cs.song.sheetMusicUrl && (
                                            <a
                                                href={cs.song.sheetMusicUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                                            >
                                                악보
                                            </a>
                                        )}
                                        {!cs.song.sheetMusicUrl && <span className="text-xs text-gray-300 dark:text-gray-600">악보 없음</span>}
                                    </div>
                                    {cs.song.artist && <p className="text-xs text-gray-400">{cs.song.artist}</p>}
                                    {cs.note && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{cs.note}</p>}
                                </div>

                                {/* 액션 버튼 */}
                                <div className="flex shrink-0 items-center gap-1">
                                    {/* 위/아래 이동 */}
                                    <button
                                        onClick={() => handleMove(index, 'up')}
                                        disabled={index === 0}
                                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20 dark:hover:bg-gray-800"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleMove(index, 'down')}
                                        disabled={index === conti.songs.length - 1}
                                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20 dark:hover:bg-gray-800"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {/* 편집 */}
                                    <button
                                        onClick={() => {
                                            setEditingCs(cs);
                                            setEditKey(cs.key ?? '');
                                            setEditNote(cs.note ?? '');
                                        }}
                                        className="rounded p-1 text-gray-400 hover:bg-violet-50 hover:text-violet-500 dark:hover:bg-violet-900/20"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                            />
                                        </svg>
                                    </button>
                                    {/* 삭제 */}
                                    <button
                                        onClick={() => handleRemoveSong(cs.id)}
                                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* 찬양 추가 패널 */}
            {showAddSong && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
                    <div className="flex h-[80vh] w-full flex-col rounded-t-2xl bg-white dark:bg-gray-900 sm:h-auto sm:max-h-[80vh] sm:max-w-lg sm:rounded-2xl">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                            <h2 className="font-bold text-gray-900 dark:text-white">찬양 추가</h2>
                            <button
                                onClick={() => {
                                    setShowAddSong(false);
                                    setSelectedSong(null);
                                    setAddingKey('');
                                    setAddingNote('');
                                    setSongSearch('');
                                }}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
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
                                {filteredSongs.length === 0 ? (
                                    <p className="py-4 text-center text-sm text-gray-400">검색 결과가 없습니다.</p>
                                ) : (
                                    filteredSongs.map((song) => {
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
                                                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                                                {song.defaultKey}
                                                            </span>
                                                        )}
                                                        {alreadyAdded && <span className="text-xs text-gray-400">추가됨</span>}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {/* 선택된 곡 - key/note 설정 */}
                            {selectedSong && (
                                <div className="mt-4 rounded-xl bg-violet-50 p-4 dark:bg-violet-900/20">
                                    <p className="mb-3 text-sm font-semibold text-violet-700 dark:text-violet-400">"{selectedSong.title}" 설정</p>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="mb-1 block text-xs text-gray-500">이 콘티에서 사용할 키</label>
                                            <select
                                                value={addingKey}
                                                onChange={(e) => setAddingKey(e.target.value)}
                                                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                            >
                                                <option value="">기본 ({selectedSong.defaultKey ?? '없음'})</option>
                                                {KEYS.map((k) => (
                                                    <option key={k} value={k}>
                                                        {k}
                                                    </option>
                                                ))}
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
                                onClick={handleAddSong}
                                disabled={!selectedSong || addingSong}
                                className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
                            >
                                {addingSong ? '추가 중...' : selectedSong ? `"${selectedSong.title}" 추가하기` : '곡을 선택하세요'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 곡 key/note 편집 모달 */}
            {editingCs && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-gray-900">
                        <h2 className="mb-4 font-bold text-gray-900 dark:text-white">{editingCs.song.title} 설정</h2>
                        <form onSubmit={handleSaveCs} className="space-y-3">
                            <div>
                                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">키</label>
                                <select
                                    value={editKey}
                                    onChange={(e) => setEditKey(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">기본 ({editingCs.song.defaultKey ?? '없음'})</option>
                                    {KEYS.map((k) => (
                                        <option key={k} value={k}>
                                            {k}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">송폼</label>
                                <input
                                    type="text"
                                    value={editNote}
                                    onChange={(e) => setEditNote(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setEditingCs(null)}
                                    className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingCs}
                                    className="flex-1 rounded-lg bg-violet-600 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
                                >
                                    {savingCs ? '저장 중...' : '저장'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
