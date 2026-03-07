'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';

interface User {
  id: string;
  email: string;
  name: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.replace('/login');
      return;
    }
    setUser(JSON.parse(stored) as User);
  }, [router]);

  const handleLogout = async () => {
    const token = localStorage.getItem('accessToken') ?? '';
    try {
      await authApi.logout(token);
    } catch {
      // 토큰 만료여도 로컬 정리 후 이동
    }
    localStorage.clear();
    router.replace('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-lg font-bold text-violet-600">WorshipLog</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-gray-600 dark:text-gray-400">{user.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {user.name}님
        </h1>
        <p className="mb-8 text-gray-500 dark:text-gray-400">오늘도 찬양으로 하나님께 영광을 돌리세요.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: '찬양 검색', desc: '곡명, 키, 장르로 찬양을 찾아보세요', icon: '🎵' },
            { title: '콘티 만들기', desc: '예배 콘티를 빠르게 구성해보세요', icon: '📋' },
            { title: '히스토리', desc: '지난 예배 기록을 확인해보세요', icon: '📅' },
          ].map((item) => (
            <div
              key={item.title}
              className="cursor-pointer rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition hover:ring-violet-400 dark:bg-gray-900 dark:ring-gray-700 dark:hover:ring-violet-500"
            >
              <div className="mb-3 text-2xl">{item.icon}</div>
              <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">{item.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
              <span className="mt-4 inline-block text-xs font-medium text-violet-500 dark:text-violet-400">
                준비 중
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
