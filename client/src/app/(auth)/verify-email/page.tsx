'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setStatus('sending');
    try {
      await authApi.resendVerification(email);
      setStatus('sent');
      setCooldown(60);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="w-full max-w-sm text-center">
      <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-2xl dark:bg-violet-900/40">
          📧
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">이메일을 확인해주세요</h2>
        <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">인증 링크를 보냈습니다.</p>
        {email && (
          <p className="mb-6 text-sm font-medium text-violet-600 dark:text-violet-400">{email}</p>
        )}
        <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">
          메일이 보이지 않으면 스팸함을 확인해주세요.
        </p>

        <button
          onClick={handleResend}
          disabled={status === 'sending' || cooldown > 0}
          className="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {status === 'sending' ? '발송 중...' : cooldown > 0 ? `재발송 (${cooldown}초)` : '인증 이메일 재발송'}
        </button>

        {status === 'sent' && (
          <p className="mt-3 text-xs text-green-600 dark:text-green-400">인증 이메일을 재발송했습니다.</p>
        )}
        {status === 'error' && (
          <p className="mt-3 text-xs text-red-500 dark:text-red-400">재발송에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
        )}

        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
          <Link href="/login" className="text-violet-600 hover:underline dark:text-violet-400">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
