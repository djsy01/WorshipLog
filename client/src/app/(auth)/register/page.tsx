'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ' +
  'placeholder:text-gray-400 outline-none transition ' +
  'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 ' +
  'dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 ' +
  'dark:focus:border-violet-400';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WorshipLog</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">찬양팀을 위한 콘티 & 예배 기록</p>
      </div>

      <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">회원가입</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">이름</label>
            <input type="text" required value={form.name} onChange={set('name')} placeholder="홍길동" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">이메일</label>
            <input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">비밀번호</label>
            <input type="password" required value={form.password} onChange={set('password')} placeholder="6자 이상" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">비밀번호 확인</label>
            <input type="password" required value={form.confirm} onChange={set('confirm')} placeholder="••••••" className={inputCls} />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-medium text-violet-600 hover:underline dark:text-violet-400">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
