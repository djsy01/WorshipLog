'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { communityApi, Post, PostComment } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

type View = 'list' | 'write' | 'detail';

const SECTIONS = [
  {
    key: 'general',
    label: '일반',
    categories: [
      { key: 'free', label: '자유게시판' },
      { key: 'meditation', label: '묵상나눔' },
      { key: 'prayer', label: '기도제목' },
      { key: 'testimony', label: '간증나눔' },
      { key: 'sheets', label: '악보/자료' },
    ],
  },
  {
    key: 'instrument',
    label: '악기별',
    categories: [
      { key: 'leader', label: '찬양팀 인도자' },
      { key: 'singer', label: '싱어' },
      { key: 'keyboard_main', label: '메인건반' },
      { key: 'keyboard_second', label: '세컨건반' },
      { key: 'electric', label: '일렉' },
      { key: 'bass', label: '베이스' },
      { key: 'acoustic', label: '어쿠스틱' },
      { key: 'drums', label: '드럼' },
    ],
  },
  {
    key: 'team',
    label: '팀별',
    categories: [
      { key: 'worship_team', label: '예배팀' },
      { key: 'broadcast_team', label: '방송팀' },
    ],
  },
];

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

function stripTags(t: string) {
  return t.replace(/<[^>]*>/g, '');
}

// ─── 댓글 ─────────────────────────────────────────────────────────────────────
function Comments({ post, token }: { post: Post; token: string }) {
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
    const c = await communityApi.createComment(token, post.id, {
      content: stripTags(input.trim()),
      isAnonymous: anon,
    });
    setComments((prev) => [...prev, c]);
    setInput('');
  }

  async function remove(commentId: string) {
    await communityApi.removeComment(token, post.id, commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  if (!loaded) {
    return (
      <button onClick={load} className="mt-3 text-xs text-violet-500 hover:underline">
        댓글 {post._count.comments}개 보기
      </button>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">댓글 {comments.length}</p>
      <div className="flex flex-col gap-2 mb-3">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-2">
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
      </div>
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
        <button
          onClick={submit}
          className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-700 transition"
        >
          등록
        </button>
      </div>
    </div>
  );
}

// ─── 사이드바 내용 ─────────────────────────────────────────────────────────────
function SidebarContent({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (key: string) => void;
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    instrument: true,
    team: true,
  });

  return (
    <nav className="py-3">
      {SECTIONS.map((section) => (
        <div key={section.key} className="mb-1">
          <button
            onClick={() => setOpenSections((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <span>{section.label}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="11"
              height="11"
              fill="currentColor"
              viewBox="0 0 16 16"
              className={`transition-transform ${openSections[section.key] ? '' : '-rotate-90'}`}
            >
              <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708" />
            </svg>
          </button>
          {openSections[section.key] && (
            <ul>
              {section.categories.map((cat) => (
                <li key={cat.key}>
                  <button
                    onClick={() => onSelect(cat.key)}
                    className={`w-full text-left px-5 py-2 text-sm transition ${
                      selected === cat.key
                        ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-semibold border-r-2 border-violet-500'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}

// ─── 글쓰기 폼 ────────────────────────────────────────────────────────────────
function WriteForm({
  category,
  token,
  onSubmit,
  onCancel,
}: {
  category: string;
  token: string;
  onSubmit: (post: Post) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [anon, setAnon] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const post = await communityApi.create(token, {
        title: stripTags(title.trim()),
        category,
        content: stripTags(content.trim()),
        isAnonymous: anon,
      });
      onSubmit(post);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          글쓰기 — <span className="text-violet-600">{getCategoryLabel(category)}</span>
        </h2>
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full px-5 py-4 text-base font-medium text-gray-900 dark:text-white bg-transparent border-b border-gray-100 dark:border-gray-800 focus:outline-none placeholder-gray-300 dark:placeholder-gray-600"
          autoComplete="off"
          maxLength={100}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요..."
          className="w-full px-5 py-4 text-sm text-gray-800 dark:text-gray-200 bg-transparent resize-none focus:outline-none placeholder-gray-400 min-h-48"
          rows={10}
          autoComplete="off"
        />
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="rounded" />
            익명으로 게시
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
              취소
            </button>
            <button
              onClick={submit}
              disabled={!title.trim() || !content.trim() || submitting}
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 transition"
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 글 상세 ──────────────────────────────────────────────────────────────────
function PostDetail({
  post,
  token,
  onBack,
  onDelete,
}: {
  post: Post;
  token: string;
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  async function remove() {
    if (!confirm('게시글을 삭제할까요?')) return;
    await communityApi.remove(token, post.id);
    onDelete(post.id);
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition mb-5"
      >
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

        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-snug mt-3">
          {post.title ?? post.content.slice(0, 50)}
        </h1>
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
        </div>

        <Comments post={post} token={token} />
      </div>
    </div>
  );
}

// ─── 글 목록 ──────────────────────────────────────────────────────────────────
function PostList({
  category,
  token,
  posts,
  hasMore,
  loading,
  onLoadMore,
  onSelect,
  onWrite,
}: {
  category: string;
  token: string;
  posts: Post[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onSelect: (post: Post) => void;
  onWrite: () => void;
}) {
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
              <button
                key={post.id}
                onClick={() => onSelect(post)}
                className="w-full text-left px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {post.title ?? post.content.slice(0, 60)}
                  </p>
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
                {post.title && post.content && (
                  <p className="mt-1 text-xs text-gray-400 truncate">{post.content.slice(0, 80)}</p>
                )}
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500">{post.author}</p>
              </button>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="w-full mt-4 py-3 text-sm text-violet-600 hover:underline disabled:opacity-40 transition"
            >
              {loading ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const router = useRouter();
  const [category, setCategory] = useState('free');
  const [view, setView] = useState<View>('list');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 글 목록 상태 - category별로 여기서 관리
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  function getToken() {
    return localStorage.getItem('accessToken') ?? '';
  }

  useEffect(() => {
    if (!localStorage.getItem('user')) router.replace('/login');
  }, [router]);

  const loadPosts = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        const c = reset ? undefined : cursor;
        const data = await communityApi.list(getToken(), category, c);
        if (data.length < 20) setHasMore(false);
        else setHasMore(true);
        if (reset) {
          setPosts(data);
          setCursor(data.length > 0 ? data[data.length - 1].id : undefined);
        } else {
          setPosts((prev) => [...prev, ...data]);
          if (data.length > 0) setCursor(data[data.length - 1].id);
        }
      } finally {
        setLoading(false);
      }
    },
    [category, cursor], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    setPosts([]);
    setHasMore(true);
    setCursor(undefined);
    setView('list');
    setSelectedPost(null);
    // reset 후 로드
    setLoading(true);
    communityApi.list(getToken(), category).then((data) => {
      if (data.length < 20) setHasMore(false);
      setPosts(data);
      setCursor(data.length > 0 ? data[data.length - 1].id : undefined);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectCategory(key: string) {
    setCategory(key);
    setSidebarOpen(false);
  }

  function handleWriteSubmit(post: Post) {
    setPosts((prev) => [post, ...prev]);
    setView('list');
  }

  function handleDeletePost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setView('list');
    setSelectedPost(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader />

      {/* 모바일 드로어 */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed top-0 left-0 h-full w-64 z-40 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto md:hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">커뮤니티</span>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
                </svg>
              </button>
            </div>
            <SidebarContent selected={category} onSelect={handleSelectCategory} />
          </aside>
        </>
      )}

      <div className="mx-auto max-w-5xl px-6 pt-6 pb-8">
        {/* 뒤로가기 — 카테고리 위 */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-6 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0" />
          </svg>
          대시보드로 돌아가기
        </button>

        <div className="flex gap-6">
        {/* ─ 데스크톱 사이드바 ─ */}
        <aside className="hidden md:block w-52 shrink-0 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 self-start sticky top-20">
          <SidebarContent selected={category} onSelect={handleSelectCategory} />
        </aside>

        {/* ─ 메인 콘텐츠 ─ */}
        <main className="flex-1 min-w-0">
          {/* 모바일 상단 바 */}
          <div className="flex items-center gap-3 mb-5 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{getCategoryLabel(category)}</span>
          </div>

          {view === 'list' && (
            <PostList
              category={category}
              token={getToken()}
              posts={posts}
              hasMore={hasMore}
              loading={loading}
              onLoadMore={() => loadPosts(false)}
              onSelect={(post) => { setSelectedPost(post); setView('detail'); }}
              onWrite={() => setView('write')}
            />
          )}

          {view === 'write' && (
            <WriteForm
              category={category}
              token={getToken()}
              onSubmit={handleWriteSubmit}
              onCancel={() => setView('list')}
            />
          )}

          {view === 'detail' && selectedPost && (
            <PostDetail
              post={selectedPost}
              token={getToken()}
              onBack={() => setView('list')}
              onDelete={handleDeletePost}
            />
          )}
        </main>
        </div>
      </div>
    </div>
  );
}
