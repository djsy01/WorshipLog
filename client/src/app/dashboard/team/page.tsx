'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { teamsApi, uploadApi, Team, CommunityPost } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import ConfirmModal from '@/components/ConfirmModal';
import { TeamList } from './TeamList';
import { TeamChatTab } from './TeamChatTab';
import { TeamContiTab } from './TeamContiTab';

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

type CommunityTab = 'chat' | 'conti';

export default function TeamPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [myUserId, setMyUserId] = useState('');

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  const [communityTab, setCommunityTab] = useState<CommunityTab>('chat');
  const [teamContis, setTeamContis] = useState<any[]>([]);
  const [loadingContis, setLoadingContis] = useState(false);

  const [messages, setMessages] = useState<CommunityPost[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [chatFilePreview, setChatFilePreview] = useState<string | null>(null);
  const [chatFileError, setChatFileError] = useState<string | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const [teamOrder, setTeamOrder] = useState<string[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const [inviteInfo, setInviteInfo] = useState<{ teamId: string; token: string; expiresAt: string } | null>(null);

  const [joinToken, setJoinToken] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinError, setJoinError] = useState('');

  const getToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return null;
    }
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
    if (!stored) {
      setShowLoginModal(true);
      setLoading(false);
      return;
    }
    const userId = (JSON.parse(stored) as { id: string }).id;
    setMyUserId(userId);
    const savedOrder = localStorage.getItem(`teamOrder_${userId}`);
    if (savedOrder) setTeamOrder(JSON.parse(savedOrder));
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    localStorage.setItem(`teamOrder_${myUserId}`, JSON.stringify(teamOrder));
  }, [teamOrder, myUserId]);

  const loadMessages = useCallback(
    async (teamId: string) => {
      const token = getToken();
      if (!token) return;
      setLoadingMessages(true);
      try {
        const data = await teamsApi.getPosts(token, teamId);
        setMessages([...data].reverse());
      } catch {
        // ignore
      } finally {
        setLoadingMessages(false);
      }
    },
    [getToken],
  );

  const selectTeam = useCallback(
    async (teamId: string) => {
      setSelectedTeamId(teamId);
      setCommunityTab('chat');
      setMessages([]);
      setTeamContis([]);
      await loadMessages(teamId);
    },
    [loadMessages],
  );

  const loadContis = useCallback(
    async (teamId: string) => {
      const token = getToken();
      if (!token) return;
      setLoadingContis(true);
      try {
        const data = await teamsApi.getContis(token, teamId);
        setTeamContis(data);
      } finally {
        setLoadingContis(false);
      }
    },
    [getToken],
  );

  const handleTabChange = async (tab: CommunityTab) => {
    setCommunityTab(tab);
    if (tab === 'conti' && selectedTeamId && teamContis.length === 0) {
      await loadContis(selectedTeamId);
    }
    if (tab === 'chat' && selectedTeamId) {
      await loadMessages(selectedTeamId);
    }
  };

  const handleChatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setChatFileError(null);
    if (f && f.size > 50 * 1024 * 1024) {
      setChatFileError(`최대 50MB까지 업로드 가능합니다. (현재: ${(f.size / 1024 / 1024).toFixed(1)}MB)`);
      if (chatFileInputRef.current) chatFileInputRef.current.value = '';
      return;
    }
    setChatFile(f);
    if (f && f.type.startsWith('image/')) {
      setChatFilePreview(URL.createObjectURL(f));
    } else {
      setChatFilePreview(null);
    }
  };

  const removeChatFile = () => {
    setChatFile(null);
    setChatFilePreview(null);
    if (chatFileInputRef.current) chatFileInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || (!chatInput.trim() && !chatFile)) return;
    const token = getToken();
    if (!token) return;
    setSendingMsg(true);
    try {
      let fileUrl: string | undefined;
      if (chatFile) {
        const res = await uploadApi.upload(token, chatFile);
        fileUrl = res.url;
      }
      const msg = await teamsApi.createPost(token, selectedTeamId, {
        content: stripTags(chatInput.trim()) || '',
        fileUrl,
      });
      setMessages((prev) => [...prev, msg]);
      setChatInput('');
      setChatFile(null);
      setChatFilePreview(null);
      if (chatFileInputRef.current) chatFileInputRef.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : '전송 실패');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!selectedTeamId) return;
    const token = getToken();
    if (!token) return;
    try {
      await teamsApi.deletePost(token, selectedTeamId, msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    }
  };

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
    setJoinError('');
    try {
      const team = await teamsApi.join(token, joinToken.trim());
      if (team) setTeams((prev) => [...prev, team]);
      setShowJoin(false);
      setJoinToken('');
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : '가입 실패');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (!confirm('팀을 삭제하시겠습니까?')) return;
    const token = getToken();
    if (!token) return;
    try {
      await teamsApi.remove(token, teamId);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      if (selectedTeamId === teamId) setSelectedTeamId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const toggleMembers = (teamId: string) => {
    setExpandedTeams((prev) => {
      const s = new Set(prev);
      s.has(teamId) ? s.delete(teamId) : s.add(teamId);
      return s;
    });
  };

  if (loading) return <div className="py-12 text-center">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader page="팀" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex gap-6">
          <div className="w-64 shrink-0 space-y-3">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              + 팀 생성
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="w-full rounded-lg border border-violet-600 px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-50 dark:border-violet-500 dark:text-violet-400 dark:hover:bg-violet-900/10"
            >
              팀 참여
            </button>
            <TeamList
              teams={teams}
              selectedTeamId={selectedTeamId}
              onSelectTeam={selectTeam}
              myUserId={myUserId}
              onToggleMembers={toggleMembers}
              expandedTeams={expandedTeams}
              teamOrder={teamOrder}
              onTeamOrderChange={setTeamOrder}
              onCreateInvite={handleCreateInvite}
              onLeaveTeam={handleLeaveTeam}
            />
          </div>

          {selectedTeam && (
            <div className="flex-1 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">{selectedTeam.name}</h2>

              <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => handleTabChange('chat')}
                  className={`px-4 py-2 font-medium transition ${
                    communityTab === 'chat'
                      ? 'border-b-2 border-violet-600 text-violet-600 dark:text-violet-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  채팅
                </button>
                <button
                  onClick={() => handleTabChange('conti')}
                  className={`px-4 py-2 font-medium transition ${
                    communityTab === 'conti'
                      ? 'border-b-2 border-violet-600 text-violet-600 dark:text-violet-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  콘티 공유
                </button>
              </div>

              {communityTab === 'chat' && (
                <TeamChatTab
                  messages={messages}
                  loading={loadingMessages}
                  chatInput={chatInput}
                  onChatInputChange={setChatInput}
                  onSendMessage={handleSendMessage}
                  sending={sendingMsg}
                  chatFile={chatFile}
                  chatFilePreview={chatFilePreview}
                  chatFileError={chatFileError}
                  onChatFileChange={handleChatFileChange}
                  onRemoveChatFile={removeChatFile}
                  chatFileInputRef={chatFileInputRef}
                  onDeleteMessage={handleDeleteMessage}
                  myUserId={myUserId}
                />
              )}

              {communityTab === 'conti' && <TeamContiTab contis={teamContis} loading={loadingContis} />}
            </div>
          )}
        </div>
      </main>

      {showLoginModal && (
        <ConfirmModal
          title="로그인 필요"
          message="팀 기능을 사용하려면 로그인이 필요합니다."
          confirmText="로그인하기"
          onConfirm={() => router.push('/login')}
          onCancel={() => router.push('/')}
        />
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">팀 생성</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                placeholder="팀 이름 *"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
              />
              <textarea
                placeholder="설명 (선택)"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2 outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!createForm.name.trim() || creating}
                  className="flex-1 rounded-lg bg-violet-600 py-2 font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {creating ? '생성 중...' : '생성하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">팀 참여</h2>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                placeholder="초대 링크 토큰"
                value={joinToken}
                onChange={(e) => setJoinToken(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
              />
              {joinError && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{joinError}</div>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoin(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!joinToken.trim() || joining}
                  className="flex-1 rounded-lg bg-violet-600 py-2 font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {joining ? '참여 중...' : '참여하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {inviteInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">초대 링크</h2>
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">토큰</p>
                <code className="break-all text-sm font-mono text-gray-900 dark:text-white">{inviteInfo.token}</code>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{new Date(inviteInfo.expiresAt).toLocaleString('ko-KR')}까지 유효합니다.</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteInfo.token);
                  alert('토큰이 복사되었습니다.');
                }}
                className="w-full rounded-lg bg-violet-600 py-2 font-medium text-white transition hover:bg-violet-700"
              >
                토큰 복사
              </button>
              <button
                onClick={() => setInviteInfo(null)}
                className="w-full rounded-lg border border-gray-200 py-2 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
