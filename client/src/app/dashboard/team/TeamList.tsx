import type { Organization, OrgRoom } from '@/lib/api';

interface Props {
  orgs: Organization[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string, orgId: string) => void;
  myUserId: string;
  onCreateInvite: (orgId: string) => void;
  onLeaveOrg: (org: Organization) => void;
  onCreateRoom: (orgId: string) => void;
  onDeleteRoom: (roomId: string) => void;
}

export function TeamList({ orgs, selectedRoomId, onSelectRoom, myUserId, onCreateInvite, onLeaveOrg, onCreateRoom, onDeleteRoom }: Props) {
  return (
    <div className="space-y-3">
      {orgs.map((org) => {
        const isLeader = org.createdBy === myUserId;
        return (
          <div key={org.id} className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {/* 팀 헤더 */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{org.name}</p>
                <p className="text-xs text-gray-400">{org.members.length}명</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {isLeader && (
                  <button
                    onClick={() => onCreateInvite(org.id)}
                    title="초대 링크"
                    className="rounded p-1 text-xs text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                  >
                    초대
                  </button>
                )}
                <button
                  onClick={() => onLeaveOrg(org)}
                  title={isLeader ? '팀 삭제' : '나가기'}
                  className="rounded p-1 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {isLeader ? '삭제' : '나가기'}
                </button>
              </div>
            </div>

            {/* 채팅방 목록 */}
            <div className="border-t border-gray-100 dark:border-gray-800 px-2 py-1.5 space-y-0.5">
              {org.rooms.length === 0 && (
                <p className="px-2 py-1 text-xs text-gray-400">채팅방이 없습니다.</p>
              )}
              {org.rooms.map((room) => (
                <div
                  key={room.id}
                  className={`group flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer transition ${
                    selectedRoomId === room.id
                      ? 'bg-violet-50 dark:bg-violet-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => onSelectRoom(room.id, org.id)}
                >
                  <span className={`text-sm ${selectedRoomId === room.id ? 'font-semibold text-violet-700 dark:text-violet-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    # {room.name}
                  </span>
                  {isLeader && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteRoom(room.id); }}
                      className="hidden group-hover:block rounded p-0.5 text-xs text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {isLeader && (
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
  );
}
