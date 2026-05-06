import type { Team } from '@/lib/api';

interface Props {
  teams: Team[];
  sharing: boolean;
  onShare: (teamId: string) => void;
  onClose: () => void;
}

export default function ShareModal({ teams, sharing, onShare, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-white">팀에 공유</h2>
        <p className="mb-4 text-xs text-gray-400">공유할 팀을 선택하세요. 팀원 모두가 이 콘티를 볼 수 있습니다.</p>
        <div className="space-y-2">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => onShare(team.id)}
              disabled={sharing}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-violet-400 hover:bg-violet-50 disabled:opacity-50 dark:border-gray-700 dark:hover:border-violet-500 dark:hover:bg-violet-900/20"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                {team.name[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{team.name}</p>
                <p className="text-xs text-gray-400">{team.members.length}명</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
          취소
        </button>
      </div>
    </div>
  );
}
