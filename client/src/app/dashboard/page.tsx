'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { bibleApi, BibleVerse } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

interface User {
  id: string;
  email: string;
  name: string;
}

const MENU_ITEMS = [
  { title: '찬양 검색', desc: '곡명, 키, BPM으로 찬양을 찾아보세요', icon: '🎵', href: '/dashboard/songs', ready: true },
  { title: '콘티 만들기', desc: '예배 콘티를 빠르게 구성해보세요', icon: '📋', href: '/dashboard/contis', ready: false },
  { title: '히스토리', desc: '지난 예배 기록을 확인해보세요', icon: '📅', href: '/dashboard/history', ready: false },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [verse, setVerse] = useState<BibleVerse | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.replace('/login'); return; }
    setUser(JSON.parse(stored) as User);

    const token = localStorage.getItem('accessToken') ?? '';
    bibleApi.today(token).then(setVerse).catch(() => null);
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {user.name}님
        </h1>
        <p className="mb-8 text-gray-500 dark:text-gray-400">오늘도 찬양으로 하나님께 영광을 돌리세요.</p>

        {verse && (
          <div className="mb-8 rounded-xl bg-violet-50 px-6 py-5 dark:bg-violet-900/20">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-400 dark:text-violet-500">
              오늘의 말씀
            </p>
            <p className="text-gray-800 dark:text-gray-200">{verse.content}</p>
            <p className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400">
              {verse.book} {verse.chapter}:{verse.verse}
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MENU_ITEMS.map((item) =>
            item.ready ? (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition hover:ring-violet-400 dark:bg-gray-900 dark:ring-gray-700 dark:hover:ring-violet-500"
              >
                <div className="mb-3 text-2xl">{item.icon}</div>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                <span className="mt-4 inline-block text-xs font-medium text-violet-500 dark:text-violet-400">
                  바로가기 →
                </span>
              </Link>
            ) : (
              <div
                key={item.title}
                className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
              >
                <div className="mb-3 text-2xl">{item.icon}</div>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                <span className="mt-4 inline-block text-xs font-medium text-gray-400 dark:text-gray-600">
                  준비 중
                </span>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
