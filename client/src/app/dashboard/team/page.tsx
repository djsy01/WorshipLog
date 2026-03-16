'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { teamsApi, Team, Conti, CommunityPost } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

type CommunityTab = 'chat' | 'conti';

export default function TeamPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myUserId, setMyUserId] = useState('');

  // 선택된 팀
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  // 탭
  const [communityTab, setCommunityTab] = useState<CommunityTab>('chat');

  // 콘티 공유
  const [teamContis, setTeamContis] = useState<Conti[]>([]);
  const [loadingContis, setLoadingContis] = useState(false);

  // 채팅 메시지
  const [messages, setMessages] = useState<CommunityPost[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 팀 순서 (localStorage 저장)
  const [teamOrder, setTeamOrder] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sortedTeamsRef = useRef<typeof teams>([]);
  const touchDragRef = useRef<string | null>(null);

  const sortedTeams = useMemo(() => {
    const result = teamOrder.length === 0 ? teams : [...teams].sort((a, b) => {
      const ai = teamOrder.indexOf(a.id);
      const bi = teamOrder.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    sortedTeamsRef.current = result;
    return result;
  }, [teams, teamOrder]);

  // 모바일 touch drag (passive: false 필요)
  useEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (!touchDragRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const items = ul.querySelectorAll<HTMLElement>('[data-team-id]');
      let targetId: string | null = null;
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          targetId = item.dataset.teamId ?? null;
        }
      });
      if (targetId && targetId !== touchDragRef.current) {
        const order = sortedTeamsRef.current.map((t) => t.id);
        const fromIdx = order.indexOf(touchDragRef.current);
        const toIdx = order.indexOf(targetId);
        if (fromIdx !== -1 && toIdx !== -1) {
          order.splice(fromIdx, 1);
          order.splice(toIdx, 0, touchDragRef.current);
          setTeamOrder([...order]);
          setDragOverId(targetId);
        }
      }
    };
    ul.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => ul.removeEventListener('touchmove', handleTouchMove);
  }, []);

  // 멤버 토글
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const toggleMembers = (teamId: string) =>
    setExpandedTeams((prev) => { const s = new Set(prev); s.has(teamId) ? s.delete(teamId) : s.add(teamId); return s; });

  // 팀 생성 모달
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  // 초대 링크
  const [inviteInfo, setInviteInfo] = useState<{ teamId: string; token: string; expiresAt: string } | null>(null);

  // 팀 참여 모달
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
    if (stored) {
      const userId = (JSON.parse(stored) as { id: string }).id;
      setMyUserId(userId);
      const savedOrder = localStorage.getItem(`teamOrder_${userId}`);
      if (savedOrder) setTeamOrder(JSON.parse(savedOrder));
    }
    loadTeams();
  }, [loadTeams]);

  // 채팅 메시지 스크롤 하단 유지
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = useCallback(async (teamId: string) => {
    const token = getToken();
    if (!token) return;
    setLoadingMessages(true);
    try {
      const data = await teamsApi.getPosts(token, teamId);
      setMessages([...data].reverse()); // 오래된 것부터 표시
    } catch {
      // ignore
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
      const data = await teamsApi.getContis(token, teamId);
      setTeamContis(data);
    } finally {
      setLoadingContis(false);
    }
  }, [getToken]);

  const handleTabChange = async (tab: CommunityTab) => {
    setCommunityTab(tab);
    if (tab === 'conti' && selectedTeamId && teamContis.length === 0) {
      await loadContis(selectedTeamId);
    }
    if (tab === 'chat' && selectedTeamId) {
      await loadMessages(selectedTeamId);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !chatInput.trim()) return;
    const token = getToken();
    if (!token) return;
    setSendingMsg(true);
    try {
      const msg = await teamsApi.createPost(token, selectedTeamId, { content: chatInput.trim() });
      setMessages((prev) => [...prev, msg]);
      setChatInput('');
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

  const moveTeam = (teamId: string, dir: -1 | 1) => {
    const order = sortedTeams.map((t) => t.id);
    const idx = order.indexOf(teamId);
    const next = idx + dir;
    if (next < 0 || next >= order.length) return;
    [order[idx], order[next]] = [order[next], order[idx]];
    setTeamOrder(order);
    if (myUserId) localStorage.setItem(`teamOrder_${myUserId}`, JSON.stringify(order));
  };

  const handleDragStart = (teamId: string) => setDragId(teamId);
  const handleDragOver = (e: React.DragEvent, teamId: string) => {
    e.preventDefault();
    setDragOverId(teamId);
    if (dragId === null || dragId === teamId) return;
    const currentOrder = sortedTeams.map((t) => t.id);
    const fromIdx = currentOrder.indexOf(dragId);
    const toIdx = currentOrder.indexOf(teamId);
    currentOrder.splice(fromIdx, 1);
    currentOrder.splice(toIdx, 0, dragId);
    setTeamOrder(currentOrder);
  };
  const handleDragEnd = () => {
    if (myUserId) localStorage.setItem(`teamOrder_${myUserId}`, JSON.stringify(sortedTeams.map((t) => t.id)));
    setDragId(null);
    setDragOverId(null);
  };

  const handleLeave = async (teamId: string, teamName: string) => {
    if (!confirm(`"${teamName}" 팀에서 나가시겠습니까?`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await teamsApi.leave(token, teamId);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      if (selectedTeamId === teamId) setSelectedTeamId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '나가기 실패');
    }
  };

  const handleKick = async (teamId: string, memberId: string, memberName: string) => {
    if (!confirm(`"${memberName}"님을 추방하시겠습니까?`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await teamsApi.kickMember(token, teamId, memberId);
      setTeams((prev) => prev.map((t) => t.id !== teamId ? t : { ...t, members: t.members.filter((m) => m.user.id !== memberId) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : '추방 실패');
    }
  };

  const handleTransfer = async (teamId: string, memberId: string, memberName: string) => {
    if (!confirm(`"${memberName}"님에게 방장을 이전하시겠습니까?`)) return;
    const token = getToken();
    if (!token) return;
    try {
      const updated = await teamsApi.transferLeader(token, teamId, memberId);
      if (updated) setTeams((prev) => prev.map((t) => t.id !== teamId ? t : updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : '방장 이전 실패');
    }
  };

  const handleDelete = async (teamId: string, teamName: string) => {
    if (!confirm(`"${teamName}" 팀을 삭제하시겠습니까?`)) return;
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

  // 날짜 포맷
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // 날짜 구분선 여부
  const needsDateSeparator = (messages: CommunityPost[], idx: number) => {
    if (idx === 0) return true;
    return formatDate(messages[idx].createdAt) !== formatDate(messages[idx - 1].createdAt);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader page="팀스페이스" />

      <main className="mx-auto max-w-5xl px-6 py-10">
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
              className="rounded-xl border border-violet-300 px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/20"
            >
              팀 참여
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
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
          <aside className={`col-span-10 md:col-span-3 ${selectedTeamId ? 'hidden md:block' : ''}`}>
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="font-bold text-gray-900 dark:text-white">내 스페이스</h2>
                <p className="mt-0.5 text-xs text-gray-400">팀을 선택해 톡방에 참여하세요</p>
              </div>

              {loading ? (
                <div className="flex justify-center py-10 text-sm text-gray-400">불러오는 중...</div>
              ) : teams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-2 text-3xl">👥</div>
                  <p className="text-sm text-gray-400">아직 팀이 없습니다.</p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-3 text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
                  >
                    첫 번째 팀 만들기
                  </button>
                </div>
              ) : (
                <ul ref={listRef} className="divide-y divide-gray-100 dark:divide-gray-800 pb-2">
                  {sortedTeams.map((team) => {
                    const isLeader = team.createdBy === myUserId;
                    const isSelected = selectedTeamId === team.id;
                    const isExpanded = expandedTeams.has(team.id);
                    const isDragging = dragId === team.id;
                    const isDragOver = dragOverId === team.id && dragId !== team.id;
                    return (
                      <li
                        key={team.id}
                        data-team-id={team.id}
                        draggable
                        onDragStart={() => handleDragStart(team.id)}
                        onDragOver={(e) => handleDragOver(e, team.id)}
                        onDragEnd={handleDragEnd}
                        className={`relative transition-opacity ${isDragging ? 'opacity-40' : 'opacity-100'} ${isDragOver ? 'ring-1 ring-inset ring-violet-400 dark:ring-violet-500' : ''}`}
                      >
                        {/* 선택 인디케이터 */}
                        {isSelected && <div className="absolute left-0 top-0 h-full w-0.5 bg-violet-500 rounded-r" />}
                        {/* 팀 선택 행 */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => selectTeam(team.id)}
                          onKeyDown={(e) => e.key === 'Enter' && selectTeam(team.id)}
                          className={`flex cursor-pointer items-center justify-between gap-2 px-5 py-4 transition ${
                            isSelected
                              ? 'bg-violet-50 dark:bg-violet-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="shrink-0 cursor-grab touch-none select-none text-gray-300 hover:text-gray-400 dark:text-gray-600 dark:hover:text-gray-500 active:cursor-grabbing"
                              onClick={(e) => e.stopPropagation()}
                              onTouchStart={(e) => { e.stopPropagation(); touchDragRef.current = team.id; setDragId(team.id); }}
                              onTouchEnd={(e) => { e.stopPropagation(); if (myUserId) localStorage.setItem(`teamOrder_${myUserId}`, JSON.stringify(sortedTeamsRef.current.map((t) => t.id))); touchDragRef.current = null; setDragId(null); setDragOverId(null); }}
                            >
                              ⠿
                            </span>
                            {isSelected && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />}
                            <span className={`truncate font-bold ${isSelected ? 'text-violet-700 dark:text-violet-400' : 'text-gray-900 dark:text-white'}`}>
                              {team.name}
                            </span>
                            {isLeader && (
                              <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                팀장
                              </span>
                            )}
                          </div>
                          {/* 멤버 토글 */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleMembers(team.id); }}
                            className="shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        </div>

                        {/* 멤버 확장 영역 */}
                        {isExpanded && (
                          <div className="mx-5 mb-4 space-y-2 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                            {team.members.map((m) => {
                              const isMemberLeader = team.createdBy === m.user.id;
                              return (
                                <div key={m.id} className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 shrink-0 rounded-full bg-violet-200 text-center text-sm font-bold leading-7 text-violet-700 dark:bg-violet-800 dark:text-violet-300">
                                      {m.user.name[0]}
                                    </div>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{m.user.name}</span>
                                    {isMemberLeader && (
                                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">방장</span>
                                    )}
                                  </div>
                                  {isLeader && !isMemberLeader && (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleTransfer(team.id, m.user.id, m.user.name)}
                                        className="rounded px-2 py-0.5 text-xs text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                                      >
                                        방장이전
                                      </button>
                                      <button
                                        onClick={() => handleKick(team.id, m.user.id, m.user.name)}
                                        className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      >
                                        추방
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            <div className="flex gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                              {isLeader && (
                                <>
                                  <button
                                    onClick={() => handleCreateInvite(team.id)}
                                    className="rounded-lg px-3 py-1.5 text-sm text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                                  >
                                    초대 링크
                                  </button>
                                  <button
                                    onClick={() => handleDelete(team.id, team.name)}
                                    className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    팀 삭제
                                  </button>
                                </>
                              )}
                              {!isLeader && (
                                <button
                                  onClick={() => handleLeave(team.id, team.name)}
                                  className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  팀 나가기
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* ── 우측: 선택된 팀 콘텐츠 (7/10) ── */}
          <section className={`col-span-10 md:col-span-7 ${!selectedTeamId ? 'hidden md:block' : ''}`}>
            {!selectedTeam ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-violet-400" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">왼쪽에서 팀을 선택해주세요</p>
                <p className="mt-1 text-xs text-gray-400">팀별 채팅과 콘티 공유를 확인할 수 있습니다.</p>
              </div>
            ) : (
              <div className="flex h-150 flex-col rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                {/* 팀 헤더 */}
                <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                  {/* 모바일 뒤로가기 */}
                  <button
                    className="mb-2 flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 md:hidden"
                    onClick={() => setSelectedTeamId(null)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/>
                    </svg>
                    팀 목록
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-violet-500 text-center text-sm font-bold leading-8 text-white">
                      {selectedTeam.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{selectedTeam.name}</p>
                      <p className="text-xs text-gray-400">
                        멤버 {selectedTeam.members.length}명
                        {selectedTeam.description && <span className="ml-2 text-gray-300 dark:text-gray-600">·</span>}
                        {selectedTeam.description && <span className="ml-2">{selectedTeam.description}</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 탭 */}
                <div className="flex border-b border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleTabChange('chat')}
                    className={`px-5 py-3 text-sm font-medium transition ${
                      communityTab === 'chat'
                        ? 'border-b-2 border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    커뮤니티
                  </button>
                  <button
                    onClick={() => handleTabChange('conti')}
                    className={`px-5 py-3 text-sm font-medium transition ${
                      communityTab === 'conti'
                        ? 'border-b-2 border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    콘티 공유
                  </button>
                </div>

                {/* 채팅 탭 */}
                {communityTab === 'chat' && (
                  <>
                    {/* 메시지 목록 */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                      {loadingMessages ? (
                        <div className="flex h-full items-center justify-center text-sm text-gray-400">불러오는 중...</div>
                      ) : messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <div className="mb-2 text-3xl">💬</div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">대화를 시작해보세요</p>
                          <p className="mt-1 text-xs text-gray-400">팀원들과 소식을 나눠보세요.</p>
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const isMine = msg.userId === myUserId;
                          const showDate = needsDateSeparator(messages, idx);
                          const showAvatar = !isMine && (idx === 0 || messages[idx - 1].userId !== msg.userId || showDate);
                          return (
                            <div key={msg.id}>
                              {/* 날짜 구분선 */}
                              {showDate && (
                                <div className="my-3 flex items-center gap-3">
                                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                                  <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                                </div>
                              )}
                              <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* 아바타 (상대방만) */}
                                {!isMine && (
                                  <div className={`h-8 w-8 shrink-0 rounded-full bg-violet-200 text-center text-sm font-bold leading-8 text-violet-700 dark:bg-violet-800 dark:text-violet-300 ${showAvatar ? '' : 'invisible'}`}>
                                    {msg.user.name[0]}
                                  </div>
                                )}
                                <div className={`flex max-w-[70%] flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                                  {/* 이름 (상대방 + 첫 메시지일 때만) */}
                                  {!isMine && showAvatar && (
                                    <span className="ml-1 text-xs font-medium text-gray-500 dark:text-gray-400">{msg.user.name}</span>
                                  )}
                                  <div className={`flex items-end gap-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div
                                      className={`group relative rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                                        isMine
                                          ? 'rounded-br-sm bg-violet-500 text-white'
                                          : 'rounded-bl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                                      }`}
                                    >
                                      {msg.content}
                                      {/* 내 메시지 삭제 버튼 */}
                                      {isMine && (
                                        <button
                                          onClick={() => handleDeleteMessage(msg.id)}
                                          className="absolute -top-5 right-0 hidden text-xs text-gray-400 hover:text-red-400 group-hover:block"
                                        >
                                          삭제
                                        </button>
                                      )}
                                    </div>
                                    <span className="shrink-0 text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* 메시지 입력 */}
                    <form
                      onSubmit={handleSendMessage}
                      className="border-t border-gray-100 p-3 dark:border-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="메시지를 입력하세요..."
                          className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                          autoComplete="off"
                        />
                        <button
                          type="submit"
                          disabled={sendingMsg || !chatInput.trim()}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white transition hover:bg-violet-600 disabled:opacity-40"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083zm-1.833 1.89L6.637 10.07l-.215-.338L.767 6.586z"/>
                          </svg>
                        </button>
                      </div>
                    </form>
                  </>
                )}

                {/* 콘티 공유 탭 */}
                {communityTab === 'conti' && (
                  <div className="flex-1 overflow-y-auto">
                    {loadingContis ? (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">불러오는 중...</div>
                    ) : teamContis.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/20">
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-violet-400" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">공유된 콘티가 없습니다</p>
                        <p className="mt-1 text-xs text-gray-400">콘티 편집 페이지에서 이 팀에 공유할 수 있습니다.</p>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {teamContis.map((conti) => (
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
                    )}
                  </div>
                )}
              </div>
            )}
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
