'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { teamsApi, Team } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

export default function TeamPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myUserId, setMyUserId] = useState('');

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

  const inviteLink = inviteInfo
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteInfo.token}`
    : '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader page="팀스페이스" />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-6 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/>
          </svg>
          대시보드로 돌아가기
        </button>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">팀스페이스</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">팀원과 콘티를 공유하고 협업하세요</p>
          </div>
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

        {loading ? (
          <div className="flex justify-center py-20 text-gray-400">불러오는 중...</div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 text-4xl">👥</div>
            <p className="text-gray-500 dark:text-gray-400">아직 팀이 없습니다.</p>
            <button onClick={() => setShowCreate(true)} className="mt-4 text-sm font-medium text-violet-600 hover:underline dark:text-violet-400">
              첫 번째 팀 만들기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => {
              const isLeader = team.createdBy === myUserId;
              return (
                <div key={team.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                        {isLeader && (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                            팀장
                          </span>
                        )}
                      </div>
                      {team.description && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {isLeader && (
                        <>
                          <button
                            onClick={() => handleCreateInvite(team.id)}
                            className="rounded px-2 py-1 text-xs text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                          >
                            초대 링크
                          </button>
                          <button
                            onClick={() => handleDelete(team.id, team.name)}
                            className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            삭제
                          </button>
                        </>
                      )}
                      {!isLeader && (
                        <button
                          onClick={() => handleLeave(team.id, team.name)}
                          className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          나가기
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 멤버 목록 */}
                  <div className="flex flex-wrap gap-2">
                    {team.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
                        <div className="h-5 w-5 rounded-full bg-violet-200 text-center text-xs font-bold leading-5 text-violet-700 dark:bg-violet-800 dark:text-violet-300">
                          {m.user.name[0]}
                        </div>
                        <span className="text-xs text-gray-700 dark:text-gray-300">{m.user.name}</span>
                        {m.role === 'leader' && <span className="text-xs text-violet-400">★</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
