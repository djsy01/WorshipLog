'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { bibleApi, contisApi, BibleVerse, Conti } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

interface User {
  id: string;
  email: string;
  name: string;
}

const MENU_ITEMS = [
  { title: '찬양검색', desc: '찬양을 찾아보아요', icon: '🎵', href: '/dashboard/songs', ready: true },
  { title: '콘티', desc: '예배 콘티를 구성해보요', icon: '📋', href: '/dashboard/contis', ready: true },
  { title: '팀스페이스', desc: '팀원과 콘티를 공유하세요', icon: '👥', href: '/dashboard/team', ready: true },
  { title: '커뮤니티', desc: '크리스천과 신앙을 나눠보세요', icon: '✝️', href: '/dashboard/community', ready: false },
  { title: '말씀 묵상', desc: '말씀으로 묵상을 시작하세요', icon: '📖', href: '/dashboard/bible', ready: false },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [recentContis, setRecentContis] = useState<Conti[]>([]);
  const [songSearch, setSongSearch] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.replace('/login');
      return;
    }
    setUser(JSON.parse(stored) as User);
    const token = localStorage.getItem('accessToken') ?? '';
    bibleApi
      .today(token)
      .then(setVerse)
      .catch(() => null);
    contisApi
      .list(token)
      .then((data) => setRecentContis(data.slice(0, 3)))
      .catch(() => null);
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* 타이틀 */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">안녕하세요, {user.name}님 👋</h1>
          <p className="text-gray-500 dark:text-gray-400">오늘도 찬양으로 하나님께 영광을 돌리세요.</p>
        </header>

        {/* 오늘의 말씀 - 풀 너비 */}
        {verse && (
          <div className="mb-10 rounded-2xl bg-violet-100 px-8 py-6 dark:bg-violet-700/20">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-800 dark:text-violet-500">오늘의 말씀</p>
            <p className="text-lg text-gray-800 dark:text-gray-200">{verse.content}</p>
            <p className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400">
              {verse.book} {verse.chapter}:{verse.verse}
            </p>
          </div>
        )}

        {/* 좌우 레이아웃 */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {/* ── 왼쪽: 메뉴 ── */}
          <div className="md:col-span-3 space-y-3">
            {MENU_ITEMS.map((item) => {
              const content = (
                <div className={`flex items-center gap-4 p-4 ${!item.ready && 'opacity-50'}`}>
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                  </div>
                </div>
              );
              return item.ready ? (
                <Link
                  key={item.title}
                  href={item.href}
                  className="block rounded-xl bg-white shadow-sm ring-1 ring-gray-200 hover:ring-violet-400 dark:bg-gray-900 dark:ring-gray-700"
                >
                  {content}
                </Link>
              ) : (
                <div key={item.title} className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                  {content}
                </div>
              );
            })}
          </div>

          {/* ── 오른쪽: 메인 콘텐츠 ── */}
          <div className="md:col-span-9 space-y-4">
            {/* 찬양 검색 카드 */}
            <div className="rounded-2xl bg-orange-100 p-8 dark:bg-orange-900/20">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-4xl">🎵</span>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">찬양 검색</h3>
              </div>
              <p className="mb-5 text-orange-800 dark:text-orange-300">곡명, 아티스트, 말씀 구절로 찬양을 바로 찾아보세요.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push(`/dashboard/songs${songSearch.trim() ? `?q=${encodeURIComponent(songSearch.trim())}` : ''}`);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  placeholder="곡명, 아티스트, 말씀 구절 (예: 시 23)..."
                  className="flex-1 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400 dark:border-orange-800 dark:bg-gray-900 dark:text-white"
                />
                <button type="submit" className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">
                  검색
                </button>
              </form>
            </div>

            {/* 최근 콘티 */}
            {recentContis.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 dark:text-white">최근 콘티</h2>
                  <Link href="/dashboard/contis" className="text-sm text-violet-500 hover:underline">
                    전체 보기
                  </Link>
                </div>
                <div className="space-y-2">
                  {recentContis.map((conti) => (
                    <Link
                      key={conti.id}
                      href={`/dashboard/contis/${conti.id}`}
                      className="flex items-center justify-between rounded-xl px-4 py-3 ring-1 ring-gray-100 transition hover:ring-violet-300 dark:ring-gray-800 dark:hover:ring-violet-700"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{conti.title}</p>
                        {conti.worshipDate && (
                          <p className="text-sm text-gray-400">
                            {new Date(conti.worshipDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">{conti.songs.length}곡</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
