interface Props {
  joinToken: string;
  joining: boolean;
  joinError: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function TeamJoinModal({ joinToken, joining, joinError, onChange, onSubmit, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">팀 참여</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="초대 링크 토큰"
            value={joinToken}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
          />
          {joinError && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{joinError}</div>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              취소
            </button>
            <button type="submit" disabled={!joinToken.trim() || joining} className="flex-1 rounded-lg bg-violet-600 py-2 font-medium text-white transition hover:bg-violet-700 disabled:opacity-50">
              {joining ? '참여 중...' : '참여하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
