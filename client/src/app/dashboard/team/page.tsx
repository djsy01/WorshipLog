'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { teamsApi, Team, Conti } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

type CommunityTab = 'feed' | 'conti';

export default function TeamPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [communityTab, setCommunityTab] = useState<CommunityTab>('feed');

  // 콘티 공유 탭
  const [teamContis, setTeamContis] = useState<{ team: Team; contis: Conti[] }[]>([]);
  const [loadingContis, setLoadingContis] = useState(false);

  // 팀 생성 모달
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  // 초대 링크
  const [inviteInfo, setInviteInfo] = useState<{ teamId: string; token: string; expiresAt: string } | null>(null);

  // 초대 토큰으로 가입
  const [joinToken, setJoinToken] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const getToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return null; }
    return token;
  }, [router]);

  const loadTeams = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await teamsApi.list(token);
      setTeams(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setMyUserId((JSON.parse(stored) as { id: string }).id);
    loadTeams();
  }, [loadTeams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !createForm.name.trim()) return;
    setCreating(true);
    try {
      const team = await teamsApi.create(token, {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
      });
      setTeams((prev) => [team, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', description: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateInvite = async (teamId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await teamsApi.createInvite(token, teamId);
      setInviteInfo({ teamId, ...data });
    } catch (e) {
      setError(e instanceof Error ? e.message : '초대 링크 생성 실패');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !joinToken.trim()) return;
    setJoining(true);
    try {
      const team = await teamsApi.join(token, joinToken.trim());
      if (team) setTeams((prev) => [...prev, team]);
      setShowJoin(false);
      setJoinToken('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '가입 실패');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async (teamId: string, teamName: string) => {
    if (!confirm(`"${teamName}" 팀에서 나가시겠습니까?`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await teamsApi.leave(token, teamId);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '나가기 실패');
    }
  };

  const handleDelete = async (teamId: string, teamName: string) => {
    if (!confirm(`"${teamName}" 팀을 삭제하시겠습니까?`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await teamsApi.remove(token, teamId);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader page="팀스페이스" />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 상단 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/>
            </svg>
            대시보드
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoin(true)}
              className="rounded-lg border border-violet-300 px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/20"
            >
              팀 참여
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              + 팀 만들기
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
            <button onClick={() => setError('')} className="ml-2 underline">닫기</button>
          </div>
        )}

        {/* 2단 레이아웃 */}
        <div className="grid grid-cols-10 gap-6">
          {/* ── 좌측: 내 스페이스 (3/10) ── */}
          <aside className="col-span-10 md:col-span-3">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">내 스페이스</h2>
                <p className="mt-0.5 text-xs text-gray-400">참여 중인 팀 목록</p>
              </div>

              {loading ? (
                <div className="flex justify-center py-12 text-sm text-gray-400">불러오는 중...</div>
              ) : teams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-2 text-3xl">👥</div>
                  <p className="text-xs text-gray-400">아직 팀이 없습니다.</p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-3 text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                  >
                    첫 번째 팀 만들기
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {teams.map((team) => {
                    const isLeader = team.createdBy === myUserId;
                    return (
                      <li key={team.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{team.name}</span>
                              {isLeader && (
                                <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                  팀장
                                </span>
                              )}
                            </div>
                            {team.description && (
                              <p className="mt-0.5 truncate text-xs text-gray-400">{team.description}</p>
                            )}
                            {/* 멤버 아바타 */}
                            <div className="mt-2 flex -space-x-1">
                              {team.members.slice(0, 5).map((m) => (
                                <div
                                  key={m.id}
                                  title={m.user.name}
                                  className="h-5 w-5 rounded-full bg-violet-200 text-center text-[10px] font-bold leading-5 text-violet-700 ring-2 ring-white dark:bg-violet-800 dark:text-violet-300 dark:ring-gray-900"
                                >
                                  {m.user.name[0]}
                                </div>
                              ))}
                              {team.members.length > 5 && (
                                <div className="h-5 w-5 rounded-full bg-gray-200 text-center text-[10px] leading-5 text-gray-500 ring-2 ring-white dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-900">
                                  +{team.members.length - 5}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* 액션 버튼 */}
                          <div className="flex shrink-0 flex-col gap-1">
                            {isLeader && (
                              <>
                                <button
                                  onClick={() => handleCreateInvite(team.id)}
                                  className="rounded px-2 py-1 text-[10px] text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                                >
                                  초대
                                </button>
                                <button
                                  onClick={() => handleDelete(team.id, team.name)}
                                  className="rounded px-2 py-1 text-[10px] text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  삭제
                                </button>
                              </>
                            )}
                            {!isLeader && (
                              <button
                                onClick={() => handleLeave(team.id, team.name)}
                                className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                나가기
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* ── 우측: 커뮤니티 (7/10) ── */}
          <section className="col-span-10 md:col-span-7">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
              {/* 탭 */}
              <div className="flex border-b border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setCommunityTab('feed')}
                  className={`px-5 py-4 text-sm font-medium transition ${
                    communityTab === 'feed'
                      ? 'border-b-2 border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  커뮤니티
                </button>
                <button
                  onClick={async () => {
                    setCommunityTab('conti');
                    if (teamContis.length === 0 && teams.length > 0) {
                      const token = getToken();
                      if (!token) return;
                      setLoadingContis(true);
                      try {
                        const results = await Promise.all(
                          teams.map((t) =>
                            teamsApi.getContis(token, t.id).then((contis) => ({ team: t, contis }))
                          )
                        );
                        setTeamContis(results.filter((r) => r.contis.length > 0));
                      } finally {
                        setLoadingContis(false);
                      }
                    }
                  }}
                  className={`px-5 py-4 text-sm font-medium transition ${
                    communityTab === 'conti'
                      ? 'border-b-2 border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  콘티 공유
                </button>
              </div>

              {/* 탭 콘텐츠 */}
              {communityTab === 'feed' && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-violet-400" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">커뮤니티 피드 준비 중</p>
                  <p className="mt-1 text-xs text-gray-400">다른 팀과 소식을 나누는 공간이 곧 열립니다.</p>
                </div>
              )}

              {communityTab === 'conti' && (
                loadingContis ? (
                  <div className="flex justify-center py-20 text-sm text-gray-400">불러오는 중...</div>
                ) : teamContis.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-violet-400" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">공유된 콘티가 없습니다</p>
                    <p className="mt-1 text-xs text-gray-400">콘티 편집 페이지에서 팀에 공유할 수 있습니다.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {teamContis.map(({ team, contis }) => (
                      <div key={team.id} className="px-5 py-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-500 dark:text-violet-400">
                          {team.name}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {contis.map((conti) => (
                            <Link
                              key={conti.id}
                              href={`/dashboard/contis/${conti.id}`}
                              className="group rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200 transition hover:ring-violet-400 dark:bg-gray-800 dark:ring-gray-700 dark:hover:ring-violet-500"
                            >
                              <h3 className="font-medium text-gray-900 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
                                {conti.title}
                              </h3>
                              {conti.worshipDate && (
                                <p className="mt-0.5 text-xs text-violet-500 dark:text-violet-400">
                                  {new Date(conti.worshipDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                                </p>
                              )}
                              <div className="mt-2 flex items-center justify-between">
                                <p className="text-xs text-gray-400">찬양 {conti.songs.length}곡</p>
                                {conti.creator && (
                                  <p className="text-xs text-gray-400">{conti.creator.name}</p>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </section>
        </div>
      </main>

      {/* 팀 만들기 모달 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">팀 만들기</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="팀 이름 *"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                required
                autoFocus
              />
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="팀 소개 (선택)"
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">취소</button>
                <button type="submit" disabled={creating || !createForm.name.trim()} className="flex-1 rounded-lg bg-violet-600 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50">
                  {creating ? '생성 중...' : '만들기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 팀 참여 모달 */}
      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">팀 참여</h2>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                value={joinToken}
                onChange={(e) => setJoinToken(e.target.value)}
                placeholder="초대 토큰 입력"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                required
                autoFocus
              />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowJoin(false)} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">취소</button>
                <button type="submit" disabled={joining || !joinToken.trim()} className="flex-1 rounded-lg bg-violet-600 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50">
                  {joining ? '참여 중...' : '참여하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 초대 링크 모달 */}
      {inviteInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">초대 링크</h2>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              아래 토큰을 팀원에게 공유하세요. 24시간 동안 유효합니다.
            </p>
            <div className="mb-3 flex gap-2">
              <input
                readOnly
                value={inviteInfo.token}
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              />
              <button
                onClick={() => navigator.clipboard.writeText(inviteInfo.token)}
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-700"
              >
                복사
              </button>
            </div>
            <p className="mb-4 text-xs text-gray-400">
              만료: {new Date(inviteInfo.expiresAt).toLocaleString('ko-KR')}
            </p>
            <button onClick={() => setInviteInfo(null)} className="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
