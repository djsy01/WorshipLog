interface Props {
  token: string;
  expiresAt: string;
  onClose: () => void;
}

export function TeamInviteModal({ token, expiresAt, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">초대 링크</h2>
        <div className="space-y-3">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400">토큰</p>
            <code className="break-all text-sm font-mono text-gray-900 dark:text-white">{token}</code>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{new Date(expiresAt).toLocaleString('ko-KR')}까지 유효합니다.</p>
          <button
            onClick={() => { navigator.clipboard.writeText(token); alert('토큰이 복사되었습니다.'); }}
            className="w-full rounded-lg bg-violet-600 py-2 font-medium text-white transition hover:bg-violet-700"
          >
            토큰 복사
          </button>
          <button onClick={onClose} className="w-full rounded-lg border border-gray-200 py-2 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
