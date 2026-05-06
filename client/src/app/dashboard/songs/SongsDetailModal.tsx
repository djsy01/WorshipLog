import { Song } from '@/lib/api';

interface SongsDetailModalProps {
  song: Song | null;
  onClose: () => void;
  onEdit: (song: Song) => void;
  onDelete: (id: string, title: string) => void;
  userId: string;
  userRole: string;
  token: string;
}

export function SongsDetailModal({ song, onClose, onEdit, onDelete, userId, userRole, token }: SongsDetailModalProps) {
  if (!song) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-gray-900 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 p-6 pb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{song.title}</h2>
            {song.artist && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{song.artist}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
            </svg>
          </button>
        </div>

        {/* 배지 */}
        <div className="flex flex-wrap gap-2 px-6 pb-4">
          {song.defaultKey && (
            <span className="rounded-lg bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              {song.defaultKey}
            </span>
          )}
          {song.tempo && (
            <span className="rounded-lg bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              ♩ {song.tempo} BPM
            </span>
          )}
          {song.scriptureRef && (
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-600 hover:bg-amber-50 hover:text-amber-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition"
            >
              📖 {song.scriptureRef}
            </button>
          )}
        </div>

        {/* 가사 */}
        {song.lyrics && (
          <div className="flex-1 overflow-y-auto border-t border-gray-100 dark:border-gray-800 px-6 py-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">가사</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{song.lyrics}</p>
          </div>
        )}

        {/* 하단 버튼 */}
        {token && (userRole === 'admin' || song.createdBy === userId) && (
          <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 p-4">
            <button
              onClick={() => {
                onEdit(song);
                onClose();
              }}
              className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 transition hover:border-violet-400 hover:text-violet-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-violet-500 dark:hover:text-violet-400"
            >
              수정
            </button>
            <button
              onClick={() => {
                onDelete(song.id, song.title);
                onClose();
              }}
              className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-400 transition hover:border-red-300 hover:text-red-500 dark:border-gray-700 dark:hover:border-red-700 dark:hover:text-red-400"
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
