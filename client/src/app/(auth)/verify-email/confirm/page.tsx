'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

function VerifyEmailConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('유효하지 않은 링크입니다.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((res) => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('user', JSON.stringify(res.user));
        setStatus('success');
        setTimeout(() => router.push('/dashboard'), 2000);
      })
      .catch((err: Error) => {
        setStatus('error');
        setErrorMsg(err.message);
      });
  }, [token, router]);

  const cardCls = 'rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700';

  if (status === 'loading') {
    return (
      <div className="w-full max-w-sm text-center">
        <div className={cardCls}>
          <p className="text-sm text-gray-500 dark:text-gray-400">이메일 인증 중...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="w-full max-w-sm text-center">
        <div className={cardCls}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl dark:bg-green-900/40">
            ✅
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">인증 완료!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">잠시 후 대시보드로 이동합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm text-center">
      <div className={cardCls}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-900/40">
          ❌
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">인증 실패</h2>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{errorMsg}</p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-violet-600 px-6 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailConfirmPage() {
  return (
    <Suspense>
      <VerifyEmailConfirmContent />
    </Suspense>
  );
}
