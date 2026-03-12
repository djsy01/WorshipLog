'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { historyApi, HistoryRecord } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return null; }
    return token;
  }, [router]);

  const loadHistory = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await historyApi.list(token);
      setRecords(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    const token = getToken();
    if (!token) return;
    try {
      await historyApi.remove(token, id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader page="히스토리" />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">예배 히스토리</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">지난 예배 기록을 확인하세요</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-gray-400">불러오는 중...</div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 text-4xl">📅</div>
            <p className="text-gray-500 dark:text-gray-400">아직 예배 기록이 없습니다.</p>
            <Link
              href="/dashboard/contis"
              className="mt-4 text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              콘티에서 예배 완료 기록하기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className="group rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
              >
                <div className="flex items-start justify-between p-5">
                  <div className="min-w-0 flex-1">
                    {/* 날짜 */}
                    <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                      {record.worshipDate
                        ? formatDate(record.worshipDate)
                        : formatDate(record.createdAt)}
                    </p>

                    {/* 콘티 제목 */}
                    {record.conti ? (
                      <Link
                        href={`/dashboard/contis/${record.conti.id}`}
                        className="mt-1 block font-medium text-gray-900 hover:text-violet-600 dark:text-white dark:hover:text-violet-400"
                      >
                        {record.conti.title}
                      </Link>
                    ) : (
                      <p className="mt-1 font-medium text-gray-400 dark:text-gray-500">콘티 없음</p>
                    )}

                    {/* 찬양 목록 */}
                    {record.conti && record.conti.songs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {record.conti.songs.map((cs, i) => (
                          <span
                            key={cs.id}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          >
                            <span className="text-gray-300 dark:text-gray-600">{i + 1}</span>
                            {cs.song.title}
                            {cs.key && (
                              <span className="font-semibold text-violet-500">{cs.key}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(record.id)}
                    className="ml-3 hidden rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 group-hover:block dark:hover:bg-red-900/20"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
