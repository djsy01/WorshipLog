'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

function PrismLogo({ className = 'w-10 h-10' }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="prismGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <path d="M50 15L85 75H15L50 15Z" stroke="url(#prismGrad)" strokeWidth="2" fill="none" opacity="0.3" />
            <path d="M50 15L65 75M50 15L35 75M50 15V75" stroke="url(#prismGrad)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="50" cy="15" r="4" fill="#4F46E5" filter="url(#glow)" />
            <rect x="25" y="82" width="50" height="3" rx="1.5" fill="#CBD5E1" />
            <rect x="35" y="90" width="30" height="3" rx="1.5" fill="#E2E8F0" />
        </svg>
    );
}

interface AppHeaderProps {
    page?: string;
}

export default function AppHeader({ page }: AppHeaderProps) {
    const router = useRouter();
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            const u = JSON.parse(stored) as { name: string };
            setUserName(u.name);
        }
    }, []);

    const handleLogout = async () => {
        const token = localStorage.getItem('accessToken') ?? '';
        try {
            await authApi.logout(token);
        } catch {
            /* 무시 */
        }
        localStorage.clear();
        router.replace('/login');
    };

    return (
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 px-6 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
                <div className="flex items-center gap-2 font-bold min-w-0">
                    <PrismLogo className="w-8 h-8 sm:w-10 sm:h-10 shrink-0" />
                    <span className="text-violet-600 text-base sm:text-lg shrink-0">WorshipLog</span>
                    {page && (
                        <>
                            <span className="text-gray-300 dark:text-gray-600 shrink-0">/</span>
                            <span className="text-gray-700 dark:text-gray-200 text-base sm:text-lg truncate">{page}</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {userName && <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">{userName}</span>}
                    <button
                        onClick={handleLogout}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        로그아웃
                    </button>
                </div>
            </div>
        </header>
    );
}
