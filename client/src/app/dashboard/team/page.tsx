'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { teamsApi, type Team, type CommunityPost } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import ConfirmModal from '@/components/ConfirmModal';
import { TeamList } from './TeamList';
import { TeamDetailPanel } from './TeamDetailPanel';
import { TeamCreateModal } from './TeamCreateModal';
import { TeamJoinModal } from './TeamJoinModal';
import { TeamInviteModal } from './TeamInviteModal';

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

  const [teamOrder, setTeamOrder] = useState<string[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ token: string; expiresAt: string } | null>(null);
  const [joinToken, setJoinToken] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinError, setJoinError] = useState('');

  const getToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return null; }
    return token;
  }, [router]);

  const loadTeams = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      setTeams(await teamsApi.list(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { setShowLoginModal(true); setLoading(false); return; }
    const userId = (JSON.parse(stored) as { id: string }).id;
    setMyUserId(userId);
    const savedOrder = localStorage.getItem(`teamOrder_${userId}`);
    if (savedOrder) setTeamOrder(JSON.parse(savedOrder));
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    localStorage.setItem(`teamOrder_${myUserId}`, JSON.stringify(teamOrder));
  }, [teamOrder, myUserId]);

  const loadMessages = useCallback(async (teamId: string) => {
    const token = getToken();
    if (!token) return;
    setLoadingMessages(true);
    try {
      setMessages([...(await teamsApi.getPosts(token, teamId))].reverse());
    } finally {
      setLoadingMessages(false);
    }
  }, [getToken]);

  const selectTeam = useCallback(async (teamId: string) => {
    setSelectedTeamId(teamId);
    setCommunityTab('chat');
    setMessages([]);
    setTeamContis([]);
    await loadMessages(teamId);
  }, [loadMessages]);

  const loadContis = useCallback(async (teamId: string) => {
    const token = getToken();
    if (!token) return;
    setLoadingContis(true);
    try {
      setTeamContis(await teamsApi.getContis(token, teamId));
    } finally {
      setLoadingContis(false);
    }
  }, [getToken]);

  const handleTabChange = async (tab: CommunityTab) => {
    setCommunityTab(tab);
    if (tab === 'conti' && selectedTeamId && teamContis.length === 0) await loadContis(selectedTeamId);
    if (tab === 'chat' && selectedTeamId) await loadMessages(selectedTeamId);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !createForm.name.trim()) return;
    setCreating(true);
    try {
      const team = await teamsApi.create(token, { name: createForm.name.trim(), description: createForm.description.trim() || undefined });
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
      setInviteInfo(await teamsApi.createInvite(token, teamId));
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
    setExpandedTeams((prev) => { const s = new Set(prev); s.has(teamId) ? s.delete(teamId) : s.add(teamId); return s; });
  };

  const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';

  if (loading) return <div className="py-12 text-center">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader page="팀" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex gap-6">
          <div className="w-64 shrink-0 space-y-3">
            <button onClick={() => setShowCreate(true)} className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700">
              + 팀 생성
            </button>
            <button onClick={() => setShowJoin(true)} className="w-full rounded-lg border border-violet-600 px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-50 dark:border-violet-500 dark:text-violet-400 dark:hover:bg-violet-900/10">
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
            <TeamDetailPanel
              team={selectedTeam}
              tab={communityTab}
              onTabChange={handleTabChange}
              messages={messages}
              loadingMessages={loadingMessages}
              myUserId={myUserId}
              token={token}
              onNewMessage={(msg) => setMessages((prev) => [...prev, msg])}
              onDeleteMessage={(id) => setMessages((prev) => prev.filter((m) => m.id !== id))}
              teamContis={teamContis}
              loadingContis={loadingContis}
            />
          )}
        </div>
      </main>

      {showLoginModal && (
        <ConfirmModal title="로그인 필요" message="팀 기능을 사용하려면 로그인이 필요합니다." confirmText="로그인하기" onConfirm={() => router.push('/login')} onCancel={() => router.push('/')} />
      )}
      {showCreate && (
        <TeamCreateModal form={createForm} creating={creating} onChange={(f, v) => setCreateForm((prev) => ({ ...prev, [f]: v }))} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
      )}
      {showJoin && (
        <TeamJoinModal joinToken={joinToken} joining={joining} joinError={joinError} onChange={setJoinToken} onSubmit={handleJoin} onClose={() => setShowJoin(false)} />
      )}
      {inviteInfo && (
        <TeamInviteModal token={inviteInfo.token} expiresAt={inviteInfo.expiresAt} onClose={() => setInviteInfo(null)} />
      )}
      {error && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}<button onClick={() => setError('')} className="ml-2">×</button>
        </div>
      )}
    </div>
  );
}
