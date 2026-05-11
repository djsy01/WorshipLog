import type { Organization } from '@/lib/api';

interface Props {
  orgs: Organization[];
  sharing: boolean;
  onShare: (roomId: string) => void;
  onClose: () => void;
}

export default function ShareModal({ orgs, sharing, onShare, onClose }: Props) {
  const rooms = orgs.flatMap((org) =>
    org.rooms.map((room) => ({ ...room, orgName: org.name }))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-white">채팅방에 공유</h2>
        <p className="mb-4 text-xs text-gray-400">공유할 채팅방을 선택하세요. 조직원 모두가 이 콘티를 볼 수 있습니다.</p>
        {rooms.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">채팅방이 없습니다.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onShare(room.id)}
                disabled={sharing}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-violet-400 hover:bg-violet-50 disabled:opacity-50 dark:border-gray-700 dark:hover:border-violet-500 dark:hover:bg-violet-900/20"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                  #
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{room.name}</p>
                  <p className="text-xs text-gray-400">{room.orgName}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
          취소
        </button>
      </div>
    </div>
  );
}
