'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { bibleApi, orgsApi, type Meditation, type Organization } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import ConfirmModal from '@/components/ConfirmModal';
import { MonthSidebar } from './MonthSidebar';
import MeditationCard from './MeditationCard';

function toMonthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  return `${year}년 ${parseInt(month)}월`;
}

export default function MeditationPage() {
  const router = useRouter();
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') ?? '';
    if (!localStorage.getItem('user')) {
      setShowLoginModal(true);
      return;
    }
    bibleApi
      .getMeditations(token)
      .then((data) => {
        // 최신순 정렬
        const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMeditations(sorted);
        // 가장 최근 월 기본 선택
        if (sorted.length > 0) {
          setSelectedMonth(toMonthKey(sorted[0].createdAt));
        }
      })
      .catch(() => null);
    orgsApi.list(token).then(setOrgs).catch(() => null);
  }, [router]);

  // 연월 목록 (최신순)
  const months = useMemo(() => {
    const keys = new Set(meditations.map((m) => toMonthKey(m.createdAt)));
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [meditations]);

  // 연월별 개수
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of meditations) {
      const k = toMonthKey(m.createdAt);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [meditations]);

  // 선택된 월의 묵상 (최신순)
  const filtered = useMemo(() => {
    if (!selectedMonth) return [];
    return meditations.filter((m) => toMonthKey(m.createdAt) === selectedMonth);
  }, [meditations, selectedMonth]);

  function handleNoteUpdate(id: string, note: string) {
    setMeditations((prev) => prev.map((x) => (x.id === id ? { ...x, note } : x)));
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader />

      {showLoginModal && (
        <ConfirmModal
          title="로그인이 필요합니다"
          message="말씀묵상 기능을 이용하려면 로그인이 필요합니다."
          confirmText="로그인"
          cancelText="돌아가기"
          onConfirm={() => router.push('/login')}
          onCancel={() => router.push('/dashboard')}
        />
      )}

      {/* 모바일 드로어 */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed top-0 left-0 h-full w-64 z-40 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto md:hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">묵상 기록</span>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
                </svg>
              </button>
            </div>
            <MonthSidebar
              months={months}
              selected={selectedMonth}
              onSelect={(k) => {
                setSelectedMonth(k);
                setSidebarOpen(false);
              }}
              counts={counts}
            />
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
            <path
              fillRule="evenodd"
              d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"
            />
          </svg>
          대시보드로 돌아가기
        </button>
        <div className="flex gap-6">
          {/* ─ 데스크톱 사이드바 ─ */}
          {months.length > 0 && (
            <aside className="hidden md:block w-52 shrink-0 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 self-start sticky top-20">
              <MonthSidebar months={months} selected={selectedMonth} onSelect={setSelectedMonth} counts={counts} />
            </aside>
          )}

          {/* ─ 메인 콘텐츠 ─ */}
          <main className="flex-1 min-w-0">
            {/* 모바일 상단 바 */}
            <div className="flex items-center gap-3 mb-5 md:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path
                    fillRule="evenodd"
                    d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"
                  />
                </svg>
              </button>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {selectedMonth ? formatMonthLabel(selectedMonth) : '묵상 기록'}
              </span>
            </div>

            {/* 헤더 */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{selectedMonth ? formatMonthLabel(selectedMonth) : '묵상 기록'}</h1>
                <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">말씀을 마음에 새긴 기록들</p>
              </div>
              {filtered.length > 0 && (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                  {filtered.length}개
                </span>
              )}
            </div>

            {/* 빈 상태 */}
            {meditations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="text-violet-300 dark:text-violet-600"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">아직 묵상 기록이 없어요</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">대시보드에서 오늘의 말씀을 확인해보세요.</p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="mt-5 rounded-xl bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 transition"
                >
                  오늘의 말씀 보기
                </button>
              </div>
            )}

            <div className="flex flex-col gap-5">
              {filtered.map((m) => (
                <MeditationCard key={m.id} m={m} orgs={orgs} onNoteUpdate={handleNoteUpdate} />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
