import { communityApi, type Post } from '@/lib/api';
import CommunityComments from './CommunityComments';
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
  post: Post;
  token: string;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export default function CommunityPostDetail({ post, token, onBack, onDelete }: Props) {
  async function remove() {
    if (!confirm('게시글을 삭제할까요?')) return;
    await communityApi.remove(token, post.id);
    onDelete(post.id);
  }

  return (
    <div className="max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0" />
        </svg>
        목록으로
      </button>

      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">
            {getCategoryLabel(post.category)}
          </span>
          {post.isMine && (
            <button onClick={remove} className="text-xs text-red-400 hover:text-red-600 transition">삭제</button>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-snug mt-3">{post.title ?? post.content.slice(0, 50)}</h1>
        <div className="flex items-center gap-2 mt-2 mb-5 text-xs text-gray-400">
          <span className="font-medium text-gray-600 dark:text-gray-400">{post.author}</span>
          <span>·</span>
          <span>{timeAgo(post.createdAt)}</span>
        </div>

        {post.meditation && (
          <div className="mb-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-l-2 border-violet-400">
            <span className="font-semibold text-violet-600 dark:text-violet-400">
              {post.meditation.book} {post.meditation.chapter}:{post.meditation.verse}
            </span>{' '}
            {post.meditation.content}
          </div>
        )}

        <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
          <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post.content}</p>
          {post.fileUrl && (
            <div className="mt-4">
              {/\.(jpg|jpeg|png|gif|webp)$/i.test(post.fileUrl) ? (
                <img src={post.fileUrl} alt="첨부 이미지" className="max-w-full rounded-xl border border-gray-100 dark:border-gray-800" />
              ) : (
                <a
                  href={post.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-200 dark:border-violet-800 px-4 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2m5.5 1.5v2a1 1 0 0 0 1 1h2z" />
                  </svg>
                  첨부파일 보기
                </a>
              )}
            </div>
          )}
        </div>

        <CommunityComments post={post} token={token} />
      </div>
    </div>
  );
}
