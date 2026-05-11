import { useState } from 'react';
import type { Organization } from '@/lib/api';

interface Props {
  orgs: Organization[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string, orgId: string) => void;
  myUserId: string;
  onCreateInvite: (orgId: string) => void;
  onLeaveOrg: (org: Organization) => void;
  onCreateRoom: (orgId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onViewMembers: (orgId: string) => void;
  onMoveOrg: (orgId: string, direction: 'up' | 'down') => void;
  onMoveRoom: (orgId: string, roomId: string, direction: 'up' | 'down') => void;
  unreadCounts: Record<string, number>;
}

export function TeamList({ orgs, selectedRoomId, onSelectRoom, myUserId, onCreateInvite, onLeaveOrg, onCreateRoom, onDeleteRoom, onViewMembers, onMoveOrg, onMoveRoom, unreadCounts }: Props) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const closeMenu = () => setOpenMenuId(null);
  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  return (
    <>
      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={closeMenu} />
      )}
      <div className="space-y-3">
        {orgs.map((org, orgIdx) => {
          const myMember = org.members.find((m) => m.userId === myUserId);
          const myRole = myMember?.role ?? 'member';
          const isLeader = myRole === 'leader';
          const canManageRooms = myRole === 'leader' || myRole === 'sub_leader';

          return (
            <div key={org.id} className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              {/* 팀 헤더 */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{org.name}</p>
                  <p className="text-xs text-gray-400">{org.members.length}명</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {/* 팀 순서 드롭다운 */}
                  <div className="relative">
                    <button
                      onClick={(e) => toggleMenu(`org-${org.id}`, e)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      title="순서 변경"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                      </svg>
                    </button>
                    {openMenuId === `org-${org.id}` && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                        <button
                          onClick={() => { onMoveOrg(org.id, 'up'); closeMenu(); }}
                          disabled={orgIdx === 0}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          ↑ 위로 이동
                        </button>
                        <button
                          onClick={() => { onMoveOrg(org.id, 'down'); closeMenu(); }}
                          disabled={orgIdx === orgs.length - 1}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          ↓ 아래로 이동
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onViewMembers(org.id)}
                    className="rounded p-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    멤버
                  </button>
                  {isLeader && (
                    <button
                      onClick={() => onCreateInvite(org.id)}
                      className="rounded p-1 text-xs text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                    >
                      초대
                    </button>
                  )}
                  <button
                    onClick={() => onLeaveOrg(org)}
                    className="rounded p-1 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {isLeader ? '삭제' : '나가기'}
                  </button>
                </div>
              </div>

              {/* 채팅방 목록 */}
              <div className="border-t border-gray-100 px-2 py-1.5 space-y-0.5 dark:border-gray-800">
                {org.rooms.length === 0 && (
                  <p className="px-2 py-1 text-xs text-gray-400">채팅방이 없습니다.</p>
                )}
                {org.rooms.map((room, roomIdx) => (
                  <div
                    key={room.id}
                    className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition ${
                      selectedRoomId === room.id
                        ? 'bg-violet-50 dark:bg-violet-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => onSelectRoom(room.id, org.id)}
                  >
                    <span className={`min-w-0 flex-1 truncate text-sm ${selectedRoomId === room.id ? 'font-semibold text-violet-700 dark:text-violet-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      # {room.name}
                    </span>
                    {(unreadCounts[room.id] ?? 0) > 0 && selectedRoomId !== room.id && (
                      <span className="shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {unreadCounts[room.id] > 99 ? '99+' : unreadCounts[room.id]}
                      </span>
                    )}
                    {canManageRooms && (
                      <div className={`${openMenuId === `room-${room.id}` ? 'flex' : 'hidden group-hover:flex'} shrink-0 items-center gap-0.5`}>
                        <div className="relative">
                          <button
                            onClick={(e) => toggleMenu(`room-${room.id}`, e)}
                            className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                            </svg>
                          </button>
                          {openMenuId === `room-${room.id}` && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                              <button
                                onClick={(e) => { e.stopPropagation(); onMoveRoom(org.id, room.id, 'up'); closeMenu(); }}
                                disabled={roomIdx === 0}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800"
                              >
                                ↑ 위로 이동
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onMoveRoom(org.id, room.id, 'down'); closeMenu(); }}
                                disabled={roomIdx === org.rooms.length - 1}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800"
                              >
                                ↓ 아래로 이동
                              </button>
                              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteRoom(room.id); closeMenu(); }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {canManageRooms && (
                  <button
                    onClick={() => onCreateRoom(org.id)}
                    className="w-full rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-50 hover:text-violet-600 dark:hover:bg-gray-800 dark:hover:text-violet-400 text-left transition"
                  >
                    + 채팅방 추가
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
