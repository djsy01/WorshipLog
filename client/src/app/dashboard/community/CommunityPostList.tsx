import type { Post } from '@/lib/api';
import { SECTIONS } from './CommunitySidebar';

function getCategoryLabel(key: string) {
  for (const s of SECTIONS) {
    const c = s.categories.find((c) => c.key === key);
    if (c) return c.label;
  }
  return key;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

interface Props {
  category: string;
  token: string;
  posts: Post[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onSelect: (post: Post) => void;
  onWrite: () => void;
}

export default function CommunityPostList({ category, token, posts, hasMore, loading, onLoadMore, onSelect, onWrite }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{getCategoryLabel(category)}</h2>
        {token && (
          <button
            onClick={onWrite}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4" />
            </svg>
            글쓰기
          </button>
        )}
      </div>

      {loading && posts.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-400">
          아직 게시글이 없어요.<br />첫 번째 글을 남겨보세요.
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
            {posts.map((post) => (
              <button key={post.id} onClick={() => onSelect(post)} className="w-full text-left px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{post.title ?? post.content.slice(0, 60)}</p>
                  <div className="shrink-0 flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.678 11.894a1 1 0 0 1 .287.801 11 11 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8 8 0 0 0 8 14c3.996 0 7-2.807 7-6s-3.004-6-7-6-7 2.808-7 6c0 1.468.617 2.83 1.678 3.894m-.493 3.905a22 22 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a10 10 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9 9 0 0 1-2.088-.243 4 4 0 0 1-2.219.615" />
                      </svg>
                      {post._count.comments}
                    </span>
                    <span>{timeAgo(post.createdAt)}</span>
                  </div>
                </div>
                {post.title && post.content && <p className="mt-1 text-xs text-gray-400 truncate">{post.content.slice(0, 80)}</p>}
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500">{post.author}</p>
              </button>
            ))}
          </div>
          {hasMore && (
            <button onClick={onLoadMore} disabled={loading} className="w-full mt-4 py-3 text-sm text-violet-600 hover:underline disabled:opacity-40 transition">
              {loading ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
