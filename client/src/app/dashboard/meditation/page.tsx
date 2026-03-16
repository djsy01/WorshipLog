'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bibleApi, communityApi, teamsApi, Meditation, Team } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

function formatRef(m: Meditation) {
  return `${m.book} ${m.chapter}:${m.verse}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function MeditationPage() {
  const router = useRouter();
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareTab, setShareTab] = useState<'community' | 'team'>('community');
  const [shareAnon, setShareAnon] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken') ?? '';
    if (!localStorage.getItem('user')) { router.replace('/login'); return; }
    bibleApi.getMeditations(token).then(setMeditations).catch(() => null);
    teamsApi.list(token).then((data) => {
      setTeams(data);
      if (data.length > 0) setSelectedTeamId(data[0].id);
    }).catch(() => null);
  }, [router]);

  function getToken() { return localStorage.getItem('accessToken') ?? ''; }

  async function saveNote(m: Meditation) {
    await bibleApi.updateNote(getToken(), m.id, noteInput);
    setMeditations((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, note: noteInput } : x)),
    );
    setEditingId(null);
  }

  function buildShareContent(m: Meditation) {
    const verse = `📖 ${formatRef(m)}\n"${m.content}"`;
    return m.note ? `${verse}\n\n✏️ 묵상\n${m.note}` : verse;
  }

  async function shareToFeed(m: Meditation) {
    await communityApi.create(getToken(), {
      content: buildShareContent(m),
      isAnonymous: shareAnon,
      meditationId: m.id,
    });
    setSharingId(null);
  }

  async function shareToTeam(m: Meditation) {
    if (!selectedTeamId) return;
    await teamsApi.createPost(getToken(), selectedTeamId, {
      content: buildShareContent(m),
    });
    setSharingId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">

        {/* 상단 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0" />
            </svg>
            대시보드
          </button>
          {meditations.length > 0 && (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              총 {meditations.length}개의 묵상
            </span>
          )}
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">묵상 기록</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">말씀을 마음에 새긴 기록들</p>
        </div>

        {/* 빈 상태 */}
        {meditations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-violet-300 dark:text-violet-600" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">아직 묵상 기록이 없어요</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">대시보드에서 오늘의 말씀을 확인해보세요.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-5 rounded-xl bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 transition"
            >
              오늘의 말씀 보기
            </button>
          </div>
        )}

        {/* 묵상 카드 목록 */}
        <div className="flex flex-col gap-5">
          {meditations.map((m) => (
            <div
              key={m.id}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800"
            >
              {/* 왼쪽 보라 세로선 */}
              <div className="absolute left-0 top-0 h-full w-1 bg-violet-400 dark:bg-violet-600" />

              <div className="px-6 py-5 pl-7">
                {/* 상단: 날짜 + 버튼 */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(m.createdAt)}</span>
                  <div className="flex gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                    <button
                      onClick={() => { setEditingId(m.id); setNoteInput(m.note ?? ''); }}
                      className="rounded-lg px-2.5 py-1 text-xs text-violet-500 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/30 transition"
                    >
                      메모
                    </button>
                    <button
                      onClick={() => { setSharingId(m.id); setShareAnon(true); setShareTab('community'); }}
                      className="rounded-lg px-2.5 py-1 text-xs text-indigo-500 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition"
                    >
                      공유
                    </button>
                  </div>
                </div>

                {/* 말씀 섹션 */}
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 dark:text-violet-500">말씀</span>
                  <span className="text-xs font-semibold text-violet-500 dark:text-violet-400">· {formatRef(m)}</span>
                </div>
                <div className="relative mb-4">
                  <span className="absolute -top-2 -left-1 select-none text-4xl leading-none text-violet-200 dark:text-violet-800">"</span>
                  <p className="font-lovespring pl-5 text-base leading-loose text-gray-800 dark:text-gray-200">
                    {m.content}
                  </p>
                </div>

                {/* 묵상 메모 */}
                {m.note && editingId !== m.id && (
                  <>
                    <div className="mb-1 flex items-center gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-amber-400" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400">묵상</span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{m.note}</p>
                  </>
                )}

                {/* 메모 편집 */}
                {editingId === m.id && (
                  <div className="mt-4 flex flex-col gap-2">
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="이 말씀으로 묵상한 내용을 적어보세요..."
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">취소</button>
                      <button onClick={() => saveNote(m)} className="text-xs bg-violet-600 text-white rounded-lg px-4 py-1.5 hover:bg-violet-700 transition">저장</button>
                    </div>
                  </div>
                )}

                {/* 공유 패널 */}
                {sharingId === m.id && (
                  <div className="mt-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 overflow-hidden">
                    {/* 탭 */}
                    <div className="flex border-b border-indigo-200 dark:border-indigo-800">
                      <button
                        onClick={() => setShareTab('community')}
                        className={`flex-1 py-2 text-xs font-semibold transition ${shareTab === 'community' ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                      >
                        커뮤니티
                      </button>
                      <button
                        onClick={() => setShareTab('team')}
                        className={`flex-1 py-2 text-xs font-semibold transition ${shareTab === 'team' ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                      >
                        팀스페이스
                      </button>
                    </div>

                    <div className="flex flex-col gap-3 p-3">
                      {/* 공유될 내용 미리보기 */}
                      <div className="rounded-lg bg-white dark:bg-gray-900 px-3 py-2.5 text-xs leading-relaxed space-y-1.5">
                        <p className="font-semibold text-violet-500 dark:text-violet-400">📖 {formatRef(m)}</p>
                        <p className="text-gray-700 dark:text-gray-300">"{m.content}"</p>
                        {m.note && (
                          <>
                            <p className="font-semibold text-amber-500 dark:text-amber-400 pt-1">✏️ 묵상</p>
                            <p className="text-gray-600 dark:text-gray-400">{m.note}</p>
                          </>
                        )}
                      </div>

                      {shareTab === 'community' && (
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={shareAnon}
                              onChange={(e) => setShareAnon(e.target.checked)}
                              className="rounded"
                            />
                            익명으로 공유
                          </label>
                          <div className="flex gap-2">
                            <button onClick={() => setSharingId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">취소</button>
                            <button onClick={() => shareToFeed(m)} className="text-xs bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 transition">올리기</button>
                          </div>
                        </div>
                      )}

                      {shareTab === 'team' && (
                        <div className="flex items-center justify-between gap-2">
                          {teams.length === 0 ? (
                            <p className="text-xs text-gray-400">참여 중인 팀이 없어요</p>
                          ) : (
                            <select
                              value={selectedTeamId}
                              onChange={(e) => setSelectedTeamId(e.target.value)}
                              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none"
                            >
                              {teams.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          )}
                          <div className="flex shrink-0 gap-2">
                            <button onClick={() => setSharingId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">취소</button>
                            <button
                              onClick={() => shareToTeam(m)}
                              disabled={teams.length === 0}
                              className="text-xs bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-40 transition"
                            >
                              보내기
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
