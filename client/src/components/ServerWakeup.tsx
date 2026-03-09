'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const PING_INTERVAL = 3000; // 3초마다 재시도
const TIMEOUT = 8000; // 요청 타임아웃

async function pingServer(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT);
        const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
        clearTimeout(timer);
        return res.ok;
    } catch {
        return false;
    }
}

export default function ServerWakeup({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false);
    const [dots, setDots] = useState('');
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        let stopped = false;

        async function tryConnect() {
            const ok = await pingServer();
            if (ok) {
                if (!stopped) setReady(true);
                return;
            }
            if (!stopped) {
                setTimeout(tryConnect, PING_INTERVAL);
            }
        }

        tryConnect();
        return () => {
            stopped = true;
        };
    }, []);

    // 경과 시간 카운터
    useEffect(() => {
        if (ready) return;
        const id = setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [ready]);

    // 로딩 점 애니메이션
    useEffect(() => {
        if (ready) return;
        const id = setInterval(() => {
            setDots((d) => (d.length >= 3 ? '' : d + '.'));
        }, 500);
        return () => clearInterval(id);
    }, [ready]);

    if (!ready) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-950 z-50 gap-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">서버에 연결 중입니다{dots}</p>
                <p className="text-gray-500 dark:text-gray-500 text-xs tabular-nums">{elapsed}초 경과</p>
                <p className="text-gray-400 dark:text-gray-600 text-xs text-center leading-relaxed">
                    서버가 잠들어 있어 깨우는 중입니다.
                    <br />
                    잠시만 기다려 주세요.
                </p>
            </div>
        );
    }

    return <>{children}</>;
}
