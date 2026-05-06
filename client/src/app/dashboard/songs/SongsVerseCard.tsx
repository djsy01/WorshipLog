import type { BibleVerse } from '@/lib/api';

function formatRef(v: BibleVerse) {
  return `${v.book} ${v.chapter}:${v.verse}`;
}

export default function SongsVerseCard({ verse, onSearch }: { verse: BibleVerse | null; onSearch: () => void }) {
  return (
    <div className="mb-6 rounded-2xl bg-violet-100 px-8 py-6 dark:bg-violet-700/20">
      {verse ? (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-800 dark:text-violet-500">오늘의 말씀</p>
            <p className="font-lovespring text-lg text-gray-800 dark:text-gray-200">{verse.content}</p>
            <p className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400">{formatRef(verse)}</p>
          </div>
          <button onClick={onSearch} className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 whitespace-nowrap">
            이 말씀으로<br />찬양 찾기
          </button>
        </div>
      ) : (
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-20 rounded bg-violet-200 dark:bg-violet-700/40" />
          <div className="h-7 w-3/4 rounded bg-violet-200 dark:bg-violet-700/40" />
          <div className="h-5 w-1/4 rounded bg-violet-200 dark:bg-violet-700/40" />
        </div>
      )}
    </div>
  );
}
