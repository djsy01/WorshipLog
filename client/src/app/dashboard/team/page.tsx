'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { orgsApi, roomsApi, type Conti, type Organization, type Message, type PendingInvite } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import ConfirmModal from '@/components/ConfirmModal';
import { useAccessToken, useStoredUser } from '@/lib/stored-user';
import { TeamList } from './TeamList';
import { TeamDetailPanel } from './TeamDetailPanel';
import { TeamCreateModal } from './TeamCreateModal';
import { TeamJoinModal } from './TeamJoinModal';
import { TeamInviteModal } from './TeamInviteModal';
import { RoomCreateModal } from './RoomCreateModal';
import { TeamMembersModal } from './TeamMembersModal';
import { useTeamActions } from './useTeamActions';
import { useTeamOrder } from './useTeamOrder';
import { useTeamPolling } from './useTeamPolling';

type Tab = 'chat' | 'conti';

export default function TeamPage() {
  const user = useStoredUser();
  return <TeamWorkspace key={user?.id} user={user} />;
}

function TeamWorkspace({ user }: { user: ReturnType<typeof useStoredUser> }) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const myUserId = user?.id ?? '';

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId) ?? null;
  const selectedRoom = selectedOrg?.rooms.find((r) => r.id === selectedRoomId) ?? null;

  const [tab, setTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [roomContis, setRoomContis] = useState<Conti[]>([]);
  const [loadingContis, setLoadingContis] = useState(false);

  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const { orderedOrgs, moveOrg, moveRoom } = useTeamOrder(orgs);

  const getToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return null; }
    return token;
  }, [router]);

  const loadOrgs = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return orgsApi.list(token).then((loaded) => {
      setOrgs(loaded);
      const counts: Record<string, number> = {};
      for (const org of loaded) {
        for (const room of org.rooms) {
          const stored = parseInt(localStorage.getItem(`chatMsgCount_${room.id}`) ?? '0', 10);
          const unread = Math.max(0, room._count.messages - stored);
          if (unread > 0) counts[room.id] = unread;
        }
      }
      setUnreadCounts(counts);
    }).catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false));
  }, [getToken]);

  const loadPendingInvites = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return orgsApi.getPendingInvites(token).then(setPendingInvites).catch(() => null);
  }, [getToken]);

  useEffect(() => {
    if (!user) return;
    loadOrgs();
    loadPendingInvites();
  }, [loadOrgs, loadPendingInvites, user]);

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
      const ordered = [...(await roomsApi.getMessages(token, roomId))].reverse();
      setMessages(ordered);
      localStorage.setItem(`chatMsgCount_${roomId}`, ordered.length.toString());
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
    setUnreadCounts((prev) => { const next = { ...prev }; delete next[roomId]; return next; });
    await loadMessages(roomId);
  }, [loadMessages]);

  const handleTabChange = async (newTab: Tab) => {
    setTab(newTab);
    if (newTab === 'conti' && selectedRoomId && roomContis.length === 0) await loadContis(selectedRoomId);
    if (newTab === 'chat' && selectedRoomId) await loadMessages(selectedRoomId);
  };

  const {
    showCreate, setShowCreate, createForm, setCreateForm, creating, handleCreate,
    showJoin, setShowJoin, joinToken, setJoinToken, joining, joinError, handleJoin,
    inviteInfo, setInviteInfo, handleCreateInvite, handleLeaveOrg,
    roomCreateOrgId, setRoomCreateOrgId, handleCreateRoom, handleDeleteRoom,
    membersOrg, setMembersOrgId, memberActionLoading, handleKickMember, handleTransferLeader, handleSetSubLeader,
    confirmModal, setConfirmModal,
  } = useTeamActions({
    orgs, myUserId, getToken, setOrgs, setError, selectedOrgId, selectedRoomId,
    clearSelection: () => { setSelectedOrgId(null); setSelectedRoomId(null); },
  });

  const token = useAccessToken() ?? '';

  useTeamPolling({ selectedRoomId, orgCount: orgs.length, setMessages, setOrgs, setUnreadCounts });

  if (user === undefined || (user && loading)) return <div className="py-12 text-center">로딩 중...</div>;

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
                unreadCounts={unreadCounts}
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
              onNewMessage={(msg) => setMessages((prev) => {
                const next = [...prev, msg];
                if (selectedRoomId) localStorage.setItem(`chatMsgCount_${selectedRoomId}`, next.length.toString());
                return next;
              })}
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

      {user === null && (
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
