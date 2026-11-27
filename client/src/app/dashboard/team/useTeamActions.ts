import { useState, type Dispatch, type SetStateAction } from "react";
import { orgsApi, roomsApi, type Organization } from "@/lib/api";

interface Options {
  orgs: Organization[];
  myUserId: string;
  getToken: () => string | null;
  setOrgs: Dispatch<SetStateAction<Organization[]>>;
  setError: (message: string) => void;
  selectedOrgId: string | null;
  selectedRoomId: string | null;
  clearSelection: () => void;
}

export function useTeamActions({
  orgs, myUserId, getToken, setOrgs, setError, selectedOrgId, selectedRoomId, clearSelection,
}: Options) {
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const [showJoin, setShowJoin] = useState(false);
  const [joinToken, setJoinToken] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [inviteInfo, setInviteInfo] = useState<{ orgId: string; token: string; expiresAt: string } | null>(null);

  const [roomCreateOrgId, setRoomCreateOrgId] = useState<string | null>(null);
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
          if (selectedOrgId === org.id) clearSelection();
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
          if (selectedRoomId === roomId) clearSelection();
        } catch (e) {
          setError(e instanceof Error ? e.message : '삭제 실패');
        }
      },
    });
  };

  return {
    showCreate, setShowCreate, createForm, setCreateForm, creating, handleCreate,
    showJoin, setShowJoin, joinToken, setJoinToken, joining, joinError, handleJoin,
    inviteInfo, setInviteInfo, handleCreateInvite, handleLeaveOrg,
    roomCreateOrgId, setRoomCreateOrgId, handleCreateRoom, handleDeleteRoom,
    membersOrg, setMembersOrgId, memberActionLoading, handleKickMember, handleTransferLeader, handleSetSubLeader,
    confirmModal, setConfirmModal,
  };
}
