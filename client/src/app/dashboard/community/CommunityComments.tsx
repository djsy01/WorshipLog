'use client';

import { useEffect, useState } from 'react';
import { communityApi, type Post, type PostComment } from '@/lib/api';

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

export default function CommunityComments({ post, token }: { post: Post; token: string }) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [anon, setAnon] = useState(true);

  useEffect(() => {
    communityApi
      .getComments(token, post.id)
      .then(setComments)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!input.trim()) return;
    const c = await communityApi.createComment(token, post.id, {
      content: input.trim().replace(/<[^>]*>/g, ''),
      isAnonymous: anon,
    });
    setComments((prev) => [...prev, c]);
    setInput('');
  }

  async function remove(commentId: string) {
    await communityApi.removeComment(token, post.id, commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">댓글 {comments.length}</p>
      {loading ? (
        <div className="text-xs text-gray-400 mb-3">불러오는 중...</div>
      ) : (
        <div className="flex flex-col gap-2 mb-3">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mr-1.5">{c.author}</span>
                <span className="text-sm text-gray-800 dark:text-gray-200">{c.content}</span>
                <span className="ml-2 text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
              </div>
              {c.isMine && (
                <button onClick={() => remove(c.id)} className="shrink-0 text-xs text-red-400 hover:text-red-600">
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {token && (
        <div className="flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
            placeholder="댓글 작성..."
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            autoComplete="off"
          />
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="rounded" />
            익명
          </label>
          <button onClick={submit} className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-700 transition">
            등록
          </button>
        </div>
      )}
    </div>
  );
}
