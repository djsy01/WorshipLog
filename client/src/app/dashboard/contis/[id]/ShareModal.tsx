import type { Organization } from '@/lib/api';

interface Props {
  orgs: Organization[];
  myUserId: string;
  sharedRoomIds: string[];
  loadingRoomId: string | null;
  onToggle: (roomId: string, isShared: boolean) => void;
  onClose: () => void;
}

export default function ShareModal({ orgs, myUserId, sharedRoomIds, loadingRoomId, onToggle, onClose }: Props) {
  const eligibleRooms = orgs.flatMap((org) => {
    const myMember = org.members.find((m) => m.userId === myUserId);
    if (!myMember || (myMember.role !== 'leader' && myMember.role !== 'sub_leader')) return [];
    return org.rooms.map((room) => ({ ...room, orgName: org.name }));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-white">채팅방에 공유</h2>
        <p className="mb-4 text-xs text-gray-400">공유할 채팅방을 선택하세요. 여러 곳에 동시에 공유할 수 있습니다.</p>

        {eligibleRooms.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">방장/부방장 권한이 있는 채팅방이 없습니다.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {eligibleRooms.map((room) => {
              const isShared = sharedRoomIds.includes(room.id);
              const loading = loadingRoomId === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => onToggle(room.id, isShared)}
                  disabled={loading}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition disabled:opacity-60 ${
                    isShared
                      ? 'border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-900/20'
                      : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50 dark:border-gray-700 dark:hover:border-violet-600 dark:hover:bg-violet-900/10'
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                    isShared ? 'border-violet-500 bg-violet-500' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isShared && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {loading && (
                      <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white"># {room.name}</p>
                    <p className="text-xs text-gray-400">{room.orgName}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
          닫기
        </button>
      </div>
    </div>
  );
}
