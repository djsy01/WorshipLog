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

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [unverified, setUnverified] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setUnverified(false);
        setLoading(true);
        try {
            const res = await authApi.login(form);
            localStorage.setItem('accessToken', res.accessToken);
            localStorage.setItem('refreshToken', res.refreshToken);
            localStorage.setItem('user', JSON.stringify(res.user));
            router.push('/dashboard');
        } catch (err) {
            const msg = err instanceof Error ? err.message : '로그인에 실패했습니다.';
            if (msg.includes('이메일 인증')) {
                setUnverified(true);
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm">
            <div className="mb-8 text-center">
                <svg viewBox="0 0 100 100" className="mx-auto mb-4 w-30 h-30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="prismGradLogin" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#4F46E5" />
                            <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                        <filter id="glowLogin">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <path d="M50 15L85 75H15L50 15Z" stroke="url(#prismGradLogin)" strokeWidth="2" fill="none" opacity="0.3" />
                    <path d="M50 15L65 75M50 15L35 75M50 15V75" stroke="url(#prismGradLogin)" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="50" cy="15" r="4" fill="#4F46E5" filter="url(#glowLogin)" />
                    <rect x="25" y="82" width="50" height="3" rx="1.5" fill="#CBD5E1" />
                    <rect x="35" y="90" width="30" height="3" rx="1.5" fill="#E2E8F0" />
                </svg>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WorshipLog</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">찬양팀을 위한 콘티 & 예배 기록</p>
            </div>

            <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">로그인</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">이메일</label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="you@example.com"
                            className={inputCls}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">비밀번호</label>
                        <input
                            type="password"
                            required
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="••••••"
                            className={inputCls}
                        />
                    </div>

                    {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>}

                    {unverified && (
                        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            이메일 인증이 필요합니다.{' '}
                            <Link href={`/verify-email?email=${encodeURIComponent(form.email)}`} className="font-medium underline">
                                인증 이메일 재발송
                            </Link>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                    >
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                </form>

                <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
                    계정이 없으신가요?{' '}
                    <Link href="/register" className="font-medium text-violet-600 hover:underline dark:text-violet-400">
                        회원가입
                    </Link>
                </p>
            </div>
        </div>
    );
}
