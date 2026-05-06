import { Conti } from '@/lib/api';
import Link from 'next/link';

interface TeamContiTabProps {
  contis: Conti[];
  loading: boolean;
}

export function TeamContiTab({ contis, loading }: TeamContiTabProps) {
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {loading && <div className="py-4 text-center text-sm text-gray-400">로딩 중...</div>}
      {!loading && contis.length === 0 && <div className="py-8 text-center text-sm text-gray-500">콘티가 없습니다.</div>}
      {contis.map((conti) => (
        <Link
          key={conti.id}
          href={`/dashboard/contis/${conti.id}`}
          className="block rounded-lg border border-gray-200 bg-white p-3 transition hover:border-violet-400 hover:bg-violet-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-violet-500 dark:hover:bg-violet-900/10"
        >
          <h4 className="font-semibold text-gray-900 dark:text-white">{conti.title}</h4>
          {conti.description && <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{conti.description}</p>}
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>곡 {conti.songs.length}개</span>
            {conti.worshipDate && <span>• {new Date(conti.worshipDate).toLocaleDateString('ko-KR')}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}
