'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { communityApi, Post, PostComment } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function CommentSection({ post, token }: { post: Post; token: string }) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [anon, setAnon] = useState(true);

  async function load() {
    const data = await communityApi.getComments(token, post.id);
    setComments(data);
    setLoaded(true);
  }

  async function submit() {
    if (!input.trim()) return;
    const c = await communityApi.createComment(token, post.id, { content: input.trim(), isAnonymous: anon });
    setComments((prev) => [...prev, c]);
    setInput('');
  }

  async function remove(commentId: string) {
    await communityApi.removeComment(token, post.id, commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  if (!loaded) {
    return (
      <button onClick={load} className="mt-2 text-xs text-violet-500 hover:underline">
        댓글 {post._count.comments}개 보기
      </button>
    );
  }

  return (
    <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start justify-between gap-2 py-1.5">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mr-1.5">{c.author}</span>
            <span className="text-sm text-gray-800 dark:text-gray-200">{c.content}</span>
            <span className="ml-2 text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
          </div>
          {c.isMine && (
            <button onClick={() => remove(c.id)} className="shrink-0 text-xs text-red-400 hover:text-red-600">삭제</button>
          )}
        </div>
      ))}

      <div className="mt-2 flex gap-2 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
          placeholder="댓글 작성..."
          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="rounded" />
          익명
        </label>
        <button onClick={submit} className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-700 transition">
          등록
        </button>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [content, setContent] = useState('');
  const [anon, setAnon] = useState(true);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function getToken() { return localStorage.getItem('accessToken') ?? ''; }

  async function loadPosts(reset = false) {
    setLoading(true);
    try {
      const c = reset ? undefined : cursor;
      const data = await communityApi.list(getToken(), c);
      if (data.length < 20) setHasMore(false);
      if (reset) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }
      if (data.length > 0) setCursor(data[data.length - 1].id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!localStorage.getItem('user')) { router.replace('/login'); return; }
    loadPosts(true);
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!content.trim()) return;
    const post = await communityApi.create(getToken(), { content: content.trim(), isAnonymous: anon });
    setPosts((prev) => [post, ...prev]);
    setContent('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  async function removePost(postId: string) {
    await communityApi.remove(getToken(), postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-6 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0" />
          </svg>
          대시보드로 돌아가기
        </button>
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">커뮤니티</h1>

        {/* 글 작성 */}
        <div className="mb-6 rounded-xl bg-white dark:bg-gray-900 p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            placeholder="나눔고 싶은 말씀이나 묵상을 적어보세요..."
            className="w-full resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none min-h-18"
            rows={3}
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="rounded" />
              익명으로 게시
            </label>
            <button
              onClick={submit}
              disabled={!content.trim()}
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 transition"
            >
              게시
            </button>
          </div>
        </div>

        {/* 피드 */}
        <div className="flex flex-col gap-4">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl bg-white dark:bg-gray-900 p-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{p.author}</span>
                    <span className="text-xs text-gray-400">{timeAgo(p.createdAt)}</span>
                  </div>
                  {/* 묵상 구절 인용 */}
                  {p.meditation && (
                    <div className="mb-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border-l-2 border-violet-400">
                      <span className="font-semibold text-violet-600 dark:text-violet-400">
                        {p.meditation.book} {p.meditation.chapter}:{p.meditation.verse}
                      </span>{' '}
                      {p.meditation.content}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{p.content}</p>
                </div>
                {p.isMine && (
                  <button onClick={() => removePost(p.id)} className="shrink-0 text-xs text-red-400 hover:text-red-600">삭제</button>
                )}
              </div>

              <CommentSection post={p} token={getToken()} />
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => loadPosts()}
              disabled={loading}
              className="mx-auto text-sm text-violet-600 hover:underline disabled:opacity-40"
            >
              {loading ? '불러오는 중...' : '더 보기'}
            </button>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="text-center text-xs text-gray-400 py-4">모든 게시글을 불러왔습니다.</p>
          )}

          {posts.length === 0 && !loading && (
            <p className="text-center text-sm text-gray-400 py-20">
              아직 게시글이 없어요.<br />첫 번째 묵상을 나눠보세요.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
