import type { PendingInvite } from '@/lib/api';

interface Props {
  joinToken: string;
  joining: boolean;
  joinError: string;
  pendingInvites: PendingInvite[];
  respondingId: string | null;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onRespond: (inviteId: string, accept: boolean) => void;
  onClose: () => void;
}

export function TeamJoinModal({ joinToken, joining, joinError, pendingInvites, respondingId, onChange, onSubmit, onRespond, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        <div className="p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">팀 참여</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="초대 링크 토큰"
              value={joinToken}
              onChange={(e) => onChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
            />
            {joinError && (
              <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{joinError}</div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                취소
              </button>
              <button type="submit" disabled={!joinToken.trim() || joining} className="flex-1 rounded-lg bg-violet-600 py-2 font-medium text-white transition hover:bg-violet-700 disabled:opacity-50">
                {joining ? '참여 중...' : '참여하기'}
              </button>
            </div>
          </form>

          {pendingInvites.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
              <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">받은 초대</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{inv.org.name}</p>
                      <p className="text-xs text-gray-400">{inv.creator.name}님의 초대</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onRespond(inv.id, true)}
                        disabled={respondingId === inv.id}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        수락
                      </button>
                      <button
                        onClick={() => onRespond(inv.id, false)}
                        disabled={respondingId === inv.id}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
