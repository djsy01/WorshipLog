'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { orgsApi, roomsApi, type Organization, type Message, type PendingInvite } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import ConfirmModal from '@/components/ConfirmModal';
import { TeamList } from './TeamList';
import { TeamDetailPanel } from './TeamDetailPanel';
import { TeamCreateModal } from './TeamCreateModal';
import { TeamJoinModal } from './TeamJoinModal';
import { TeamInviteModal } from './TeamInviteModal';
import { RoomCreateModal } from './RoomCreateModal';
import { TeamMembersModal } from './TeamMembersModal';

type Tab = 'chat' | 'conti';

export default function TeamPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [myUserId, setMyUserId] = useState('');

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId) ?? null;
  const selectedRoom = selectedOrg?.rooms.find((r) => r.id === selectedRoomId) ?? null;

  const [tab, setTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [roomContis, setRoomContis] = useState<any[]>([]);
  const [loadingContis, setLoadingContis] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const [showJoin, setShowJoin] = useState(false);
  const [joinToken, setJoinToken] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [inviteInfo, setInviteInfo] = useState<{ orgId: string; token: string; expiresAt: string } | null>(null);

  const [roomCreateOrgId, setRoomCreateOrgId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const [membersOrgId, setMembersOrgId] = useState<string | null>(null);
  const membersOrg = orgs.find((o) => o.id === membersOrgId) ?? null;
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message?: string;
    confirmText?: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const [orgOrder, setOrgOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('teamOrgOrder') ?? '[]'); } catch { return []; }
  });
  const [roomOrders, setRoomOrders] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem('teamRoomOrders') ?? '{}'); } catch { return {}; }
  });

  const orderedOrgs = useMemo(() => {
    const orderMap = new Map(orgOrder.map((id, i) => [id, i]));
    return [...orgs]
      .sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999))
      .map((org) => {
        const roomOrder = roomOrders[org.id];
        if (!roomOrder) return org;
        const roomMap = new Map(roomOrder.map((id, i) => [id, i]));
        return { ...org, rooms: [...org.rooms].sort((a, b) => (roomMap.get(a.id) ?? 9999) - (roomMap.get(b.id) ?? 9999)) };
      });
  }, [orgs, orgOrder, roomOrders]);

  const moveOrg = useCallback((orgId: string, direction: 'up' | 'down') => {
    setOrgOrder((prev) => {
      const base = prev.length > 0 ? prev : orgs.map((o) => o.id);
      const idx = base.indexOf(orgId);
      if (idx === -1) return base;
      const next = [...base];
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return next;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      localStorage.setItem('teamOrgOrder', JSON.stringify(next));
      return next;
    });
  }, [orgs]);

  const moveRoom = useCallback((orgId: string, roomId: string, direction: 'up' | 'down') => {
    setRoomOrders((prev) => {
      const org = orgs.find((o) => o.id === orgId);
      const base = prev[orgId] ?? org?.rooms.map((r) => r.id) ?? [];
      const idx = base.indexOf(roomId);
      if (idx === -1) return prev;
      const next = [...base];
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      const updated = { ...prev, [orgId]: next };
      localStorage.setItem('teamRoomOrders', JSON.stringify(updated));
      return updated;
    });
  }, [orgs]);

  const getToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return null; }
    return token;
  }, [router]);

  const loadOrgs = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      setOrgs(await orgsApi.list(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const loadPendingInvites = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      setPendingInvites(await orgsApi.getPendingInvites(token));
    } catch { /* silent */ }
  }, [getToken]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { setShowLoginModal(true); setLoading(false); return; }
    setMyUserId((JSON.parse(stored) as { id: string }).id);
    loadOrgs();
    loadPendingInvites();
  }, [loadOrgs, loadPendingInvites]);

  const handleRespondInvite = async (inviteId: string, accept: boolean) => {
    const token = getToken();
    if (!token) return;
    setRespondingId(inviteId);
    try {
      if (accept) {
        const org = await orgsApi.acceptInvite(token, inviteId);
        setOrgs((prev) => [...prev, org]);
      } else {
        await orgsApi.rejectInvite(token, inviteId);
      }
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '처리 실패');
    } finally {
      setRespondingId(null);
    }
  };

  const loadMessages = useCallback(async (roomId: string) => {
    const token = getToken();
    if (!token) return;
    setLoadingMessages(true);
    try {
      setMessages([...(await roomsApi.getMessages(token, roomId))].reverse());
    } finally {
      setLoadingMessages(false);
    }
  }, [getToken]);

  const loadContis = useCallback(async (roomId: string) => {
    const token = getToken();
    if (!token) return;
    setLoadingContis(true);
    try {
      setRoomContis(await roomsApi.getContis(token, roomId));
    } finally {
      setLoadingContis(false);
    }
  }, [getToken]);

  const selectRoom = useCallback(async (roomId: string, orgId: string) => {
    setSelectedRoomId(roomId);
    setSelectedOrgId(orgId);
    setTab('chat');
    setMessages([]);
    setRoomContis([]);
    await loadMessages(roomId);
  }, [loadMessages]);

  const handleTabChange = async (newTab: Tab) => {
    setTab(newTab);
    if (newTab === 'conti' && selectedRoomId && roomContis.length === 0) await loadContis(selectedRoomId);
    if (newTab === 'chat' && selectedRoomId) await loadMessages(selectedRoomId);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !createForm.name.trim()) return;
    setCreating(true);
    try {
      const org = await orgsApi.create(token, { name: createForm.name.trim(), description: createForm.description.trim() || undefined });
      setOrgs((prev) => [org, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', description: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateInvite = async (orgId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const info = await orgsApi.createInvite(token, orgId);
      setInviteInfo({ orgId, ...info });
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
      const org = await orgsApi.join(token, joinToken.trim());
      if (org) setOrgs((prev) => [...prev, org]);
      setShowJoin(false);
      setJoinToken('');
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : '가입 실패');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveOrg = (org: Organization) => {
    const isLeader = org.createdBy === myUserId;
    setConfirmModal({
      title: isLeader ? `"${org.name}" 팀 삭제` : `"${org.name}" 나가기`,
      message: isLeader ? '팀을 삭제하면 모든 채팅방이 함께 삭제됩니다.' : '팀에서 나가시겠습니까?',
      confirmText: isLeader ? '삭제' : '나가기',
      destructive: true,
      onConfirm: async () => {
        setConfirmModal(null);
        const token = getToken();
        if (!token) return;
        try {
          if (isLeader) {
            await orgsApi.remove(token, org.id);
          } else {
            await orgsApi.leave(token, org.id);
          }
          setOrgs((prev) => prev.filter((o) => o.id !== org.id));
          if (selectedOrgId === org.id) { setSelectedOrgId(null); setSelectedRoomId(null); }
        } catch (e) {
          setError(e instanceof Error ? e.message : '실패');
        }
      },
    });
  };

  const handleKickMember = (orgId: string, memberUserId: string) => {
    setConfirmModal({
      title: '멤버 추방',
      message: '해당 멤버를 팀에서 추방하시겠습니까?',
      confirmText: '추방',
      destructive: true,
      onConfirm: async () => {
        setConfirmModal(null);
        const token = getToken();
        if (!token) return;
        setMemberActionLoading(memberUserId);
        try {
          await orgsApi.kickMember(token, orgId, memberUserId);
          setOrgs((prev) =>
            prev.map((o) => o.id === orgId ? { ...o, members: o.members.filter((m) => m.userId !== memberUserId) } : o),
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : '추방 실패');
        } finally {
          setMemberActionLoading(null);
        }
      },
    });
  };

  const handleTransferLeader = (orgId: string, memberUserId: string) => {
    setConfirmModal({
      title: '방장 이전',
      message: '방장 권한을 이 멤버에게 이전하시겠습니까? 이전 후 회원님은 일반 멤버가 됩니다.',
      confirmText: '이전',
      onConfirm: async () => {
        setConfirmModal(null);
        const token = getToken();
        if (!token) return;
        setMemberActionLoading(memberUserId);
        try {
          const updated = await orgsApi.transferLeader(token, orgId, memberUserId);
          setOrgs((prev) => prev.map((o) => o.id === orgId ? updated : o));
        } catch (e) {
          setError(e instanceof Error ? e.message : '방장 이전 실패');
        } finally {
          setMemberActionLoading(null);
        }
      },
    });
  };

  const handleSetSubLeader = async (orgId: string, memberUserId: string, isSubLeader: boolean) => {
    const token = getToken();
    if (!token) return;
    setMemberActionLoading(memberUserId);
    try {
      const updated = await orgsApi.setSubLeader(token, orgId, memberUserId, isSubLeader);
      setOrgs((prev) => prev.map((o) => o.id === orgId ? updated : o));
    } catch (e) {
      setError(e instanceof Error ? e.message : '부방장 설정 실패');
    } finally {
      setMemberActionLoading(null);
    }
  };

  const handleCreateRoom = async (name: string) => {
    if (!roomCreateOrgId) return;
    const token = getToken();
    if (!token) return;
    const room = await roomsApi.create(token, { orgId: roomCreateOrgId, name });
    setOrgs((prev) =>
      prev.map((o) => o.id === roomCreateOrgId ? { ...o, rooms: [...o.rooms, room] } : o)
    );
    setRoomCreateOrgId(null);
  };

  const handleDeleteRoom = (roomId: string) => {
    setConfirmModal({
      title: '채팅방 삭제',
      message: '채팅방을 삭제하면 모든 메시지가 함께 삭제됩니다.',
      confirmText: '삭제',
      destructive: true,
      onConfirm: async () => {
        setConfirmModal(null);
        const token = getToken();
        if (!token) return;
        try {
          await roomsApi.remove(token, roomId);
          setOrgs((prev) =>
            prev.map((o) => ({ ...o, rooms: o.rooms.filter((r) => r.id !== roomId) }))
          );
          if (selectedRoomId === roomId) { setSelectedRoomId(null); setSelectedOrgId(null); }
        } catch (e) {
          setError(e instanceof Error ? e.message : '삭제 실패');
        }
      },
    });
  };

  const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';

  if (loading) return <div className="py-12 text-center">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader page="팀스페이스" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex gap-6">
          {/* 좌측 패널 */}
          <div className="w-64 shrink-0 space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(true)} className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-700">
                + 팀 생성
              </button>
              <button onClick={() => setShowJoin(true)} className="flex-1 rounded-lg border border-violet-600 px-3 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-50 dark:border-violet-500 dark:text-violet-400 dark:hover:bg-violet-900/10">
                참여
              </button>
            </div>

            {orgs.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">팀이 없습니다.<br />팀을 생성하거나 참여하세요.</p>
            ) : (
              <TeamList
                orgs={orderedOrgs}
                selectedRoomId={selectedRoomId}
                onSelectRoom={selectRoom}
                myUserId={myUserId}
                onCreateInvite={handleCreateInvite}
                onLeaveOrg={handleLeaveOrg}
                onCreateRoom={(orgId) => setRoomCreateOrgId(orgId)}
                onDeleteRoom={handleDeleteRoom}
                onViewMembers={(orgId) => setMembersOrgId(orgId)}
                onMoveOrg={moveOrg}
                onMoveRoom={moveRoom}
              />
            )}
          </div>

          {/* 우측 패널 */}
          {selectedOrg && selectedRoom ? (
            <TeamDetailPanel
              org={selectedOrg}
              room={selectedRoom}
              tab={tab}
              onTabChange={handleTabChange}
              messages={messages}
              loadingMessages={loadingMessages}
              myUserId={myUserId}
              token={token}
              onNewMessage={(msg) => setMessages((prev) => [...prev, msg])}
              onDeleteMessage={(id) => setMessages((prev) => prev.filter((m) => m.id !== id))}
              roomContis={roomContis}
              loadingContis={loadingContis}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-400">채팅방을 선택하세요.</p>
            </div>
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
        <TeamJoinModal
          joinToken={joinToken}
          joining={joining}
          joinError={joinError}
          pendingInvites={pendingInvites}
          respondingId={respondingId}
          onChange={setJoinToken}
          onSubmit={handleJoin}
          onRespond={handleRespondInvite}
          onClose={() => setShowJoin(false)}
        />
      )}
      {inviteInfo && (
        <TeamInviteModal
          orgId={inviteInfo.orgId}
          token={inviteInfo.token}
          expiresAt={inviteInfo.expiresAt}
          authToken={token}
          onMemberAdded={loadOrgs}
          onClose={() => setInviteInfo(null)}
        />
      )}
      {roomCreateOrgId && (
        <RoomCreateModal onSubmit={handleCreateRoom} onClose={() => setRoomCreateOrgId(null)} />
      )}
      {membersOrg && (
        <TeamMembersModal
          org={membersOrg}
          myUserId={myUserId}
          actionLoading={memberActionLoading}
          onKick={(memberUserId) => handleKickMember(membersOrg.id, memberUserId)}
          onTransfer={(memberUserId) => handleTransferLeader(membersOrg.id, memberUserId)}
          onSetSubLeader={(memberUserId, isSubLeader) => handleSetSubLeader(membersOrg.id, memberUserId, isSubLeader)}
          onClose={() => setMembersOrgId(null)}
        />
      )}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          destructive={confirmModal.destructive}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {error && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}<button onClick={() => setError('')} className="ml-2">×</button>
        </div>
      )}
    </div>
  );
}
