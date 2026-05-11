import type { Organization } from '@/lib/api';

interface Props {
  org: Organization;
  myUserId: string;
  actionLoading: string | null;
  onKick: (memberUserId: string) => void;
  onTransfer: (memberUserId: string) => void;
  onSetSubLeader: (memberUserId: string, isSubLeader: boolean) => void;
  onClose: () => void;
}

const ROLE_ORDER = { leader: 0, sub_leader: 1, member: 2 } as const;

const roleLabel = (role: string) => {
  if (role === 'leader') return { text: '방장', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' };
  if (role === 'sub_leader') return { text: '부방장', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
  return { text: '멤버', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' };
};

export function TeamMembersModal({ org, myUserId, actionLoading, onKick, onTransfer, onSetSubLeader, onClose }: Props) {
  const myMember = org.members.find((m) => m.userId === myUserId);
  const myRole = myMember?.role ?? 'member';
  const isLeader = myRole === 'leader';
  const isSubLeader = myRole === 'sub_leader';

  const sorted = [...org.members].sort((a, b) => {
    const roleA = ROLE_ORDER[a.role as keyof typeof ROLE_ORDER] ?? 2;
    const roleB = ROLE_ORDER[b.role as keyof typeof ROLE_ORDER] ?? 2;
    if (roleA !== roleB) return roleA - roleB;
    return a.user.name.localeCompare(b.user.name, 'ko');
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {org.name} 멤버 <span className="text-sm font-normal text-gray-400">({org.members.length}명)</span>
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">✕</button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sorted.map((m) => {
              const label = roleLabel(m.role);
              const isMe = m.userId === myUserId;
              const loading = actionLoading === m.userId;

              const canKick =
                !isMe &&
                m.role !== 'leader' &&
                (isLeader || (isSubLeader && m.role === 'member'));
              const canSetSubLeader = isLeader && !isMe && m.role !== 'leader';
              const canTransfer = isLeader && !isMe && m.role !== 'leader';

              return (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {m.user.name}
                      {isMe && <span className="ml-1 text-xs font-normal text-gray-400">(나)</span>}
                    </p>
                    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${label.cls}`}>
                      {label.text}
                    </span>
                  </div>

                  {(canKick || canSetSubLeader || canTransfer) && (
                    <div className="flex gap-1 shrink-0 ml-2">
                      {canSetSubLeader && (
                        <button
                          onClick={() => onSetSubLeader(m.userId, m.role !== 'sub_leader')}
                          disabled={loading}
                          className="rounded-lg border border-blue-200 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                          {m.role === 'sub_leader' ? '부방장 해제' : '부방장'}
                        </button>
                      )}
                      {canTransfer && (
                        <button
                          onClick={() => onTransfer(m.userId)}
                          disabled={loading}
                          className="rounded-lg border border-violet-200 px-2.5 py-1 text-xs text-violet-600 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-900/20"
                        >
                          방장 이전
                        </button>
                      )}
                      {canKick && (
                        <button
                          onClick={() => onKick(m.userId)}
                          disabled={loading}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          추방
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
