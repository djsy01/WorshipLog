'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { contisApi, Conti } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

export default function ContisPage() {
  const router = useRouter();
  const [contis, setContis] = useState<Conti[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 생성 모달
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', worshipDate: '' });
  const [saving, setSaving] = useState(false);

  const getToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return null; }
    return token;
  }, [router]);

  const loadContis = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await contisApi.list(token);
      setContis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { loadContis(); }, [loadContis]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !form.title.trim()) return;
    setSaving(true);
    try {
      const conti = await contisApi.create(token, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        worshipDate: form.worshipDate || undefined,
      });
      setContis((prev) => [conti, ...prev]);
      setShowModal(false);
      setForm({ title: '', description: '', worshipDate: '' });
      router.push(`/dashboard/contis/${conti.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 콘티를 삭제할까요?')) return;
    const token = getToken();
    if (!token) return;
    try {
      await contisApi.remove(token, id);
      setContis((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader page="콘티" />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-6 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/>
          </svg>
          대시보드로 돌아가기
        </button>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">예배 콘티</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">예배 순서와 찬양을 구성하세요</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            + 새 콘티
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-gray-400">불러오는 중...</div>
        ) : contis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 text-4xl">📋</div>
            <p className="text-gray-500 dark:text-gray-400">아직 콘티가 없습니다.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              첫 번째 콘티 만들기
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contis.map((conti) => (
              <div
                key={conti.id}
                className="group relative rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition hover:ring-violet-400 dark:bg-gray-900 dark:ring-gray-700 dark:hover:ring-violet-500"
              >
                <Link href={`/dashboard/contis/${conti.id}`} className="block">
                  <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">{conti.title}</h3>
                  {conti.worshipDate && (
                    <p className="mb-2 text-xs text-violet-500 dark:text-violet-400">
                      {new Date(conti.worshipDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                  {conti.description && (
                    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{conti.description}</p>
                  )}
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    찬양 {conti.songs.length}곡
                  </p>
                </Link>
                <button
                  onClick={() => handleDelete(conti.id)}
                  className="absolute right-3 top-3 hidden rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500 group-hover:block dark:hover:bg-red-900/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 새 콘티 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">새 콘티 만들기</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="예) 3월 둘째 주 주일 예배"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">예배 날짜</label>
                <input
                  type="date"
                  value={form.worshipDate}
                  onChange={(e) => setForm((f) => ({ ...f, worshipDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">메모</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="예배에 대한 간단한 메모"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm({ title: '', description: '', worshipDate: '' }); }}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.title.trim()}
                  className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {saving ? '생성 중...' : '만들기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
