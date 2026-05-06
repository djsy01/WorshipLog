'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { communityApi, type Post } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import { CommunitySidebar, SECTIONS } from './CommunitySidebar';
import CommunityPostList from './CommunityPostList';
import CommunityWriteForm from './CommunityWriteForm';
import CommunityPostDetail from './CommunityPostDetail';

type View = 'list' | 'write' | 'detail';

function getCategoryLabel(key: string) {
  for (const s of SECTIONS) {
    const c = s.categories.find((c) => c.key === key);
    if (c) return c.label;
  }
  return key;
}

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('accessToken') ?? '';
}

export default function CommunityPage() {
  const router = useRouter();
  const [category, setCategory] = useState('free');
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [view, setView] = useState<View>('list');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    communityApi
      .list(getToken(), category)
      .then((data) => {
        if (data.length < 20) setHasMore(false);
        setPosts(data);
        setCursor(data.length > 0 ? data[data.length - 1].id : undefined);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category, reloadTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectCategory(key: string) {
    setCategory(key);
    setReloadTrigger((t) => t + 1);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader />

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
            <CommunitySidebar selected={category} onSelect={handleSelectCategory} />
          </aside>
        </>
      )}

      <div className="mx-auto max-w-5xl px-6 pt-6 pb-8">
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
          <aside className="hidden md:block w-52 shrink-0 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 self-start sticky top-20">
            <CommunitySidebar selected={category} onSelect={handleSelectCategory} />
          </aside>

          <main className="flex-1 min-w-0">
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
              <CommunityPostList
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
              <CommunityWriteForm
                category={category}
                token={getToken()}
                onSubmit={(post) => { setPosts((prev) => [post, ...prev]); setView('list'); }}
                onCancel={() => setView('list')}
              />
            )}
            {view === 'detail' && selectedPost && (
              <CommunityPostDetail
                post={selectedPost}
                token={getToken()}
                onBack={() => setView('list')}
                onDelete={(id) => { setPosts((prev) => prev.filter((p) => p.id !== id)); setView('list'); setSelectedPost(null); }}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
