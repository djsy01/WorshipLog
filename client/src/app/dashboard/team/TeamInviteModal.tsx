'use client';

import { useState } from 'react';
import { orgsApi } from '@/lib/api';

interface Props {
  orgId: string;
  token: string;
  expiresAt: string;
  authToken: string;
  onMemberAdded: () => void;
  onClose: () => void;
}

export function TeamInviteModal({ orgId, token, expiresAt, authToken, onMemberAdded, onClose }: Props) {
  const [tab, setTab] = useState<'link' | 'email'>('link');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const expires = new Date(expiresAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  function copyToken() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleEmailInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setEmailError('');
    setEmailSuccess('');
    try {
      await orgsApi.inviteByEmail(authToken, orgId, email.trim());
      setEmailSuccess(`${email} 님을 팀에 추가했습니다.`);
      setEmail('');
      onMemberAdded();
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : '초대에 실패했습니다.');
    } finally {
      setSending(false);
    }
  }

  const tabCls = (active: boolean) =>
    `flex-1 py-2 text-sm font-semibold transition ${active ? 'border-b-2 border-violet-600 text-violet-600 dark:text-violet-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button onClick={() => setTab('link')} className={tabCls(tab === 'link')} style={{ borderRadius: '16px 0 0 0' }}>
            링크 공유
          </button>
          <button onClick={() => setTab('email')} className={tabCls(tab === 'email')} style={{ borderRadius: '0 16px 0 0' }}>
            이메일 초대
          </button>
        </div>

        <div className="p-6">
          {tab === 'link' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                아래 토큰을 공유하세요. 유효 시간 안에 여러 명이 사용할 수 있습니다.
              </p>
              <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
                <p className="mb-1 text-xs text-gray-400">초대 토큰</p>
                <code className="break-all text-sm font-mono text-gray-900 dark:text-white">{token}</code>
              </div>
              <p className="text-xs text-gray-400">{expires}까지 유효</p>
              <button
                onClick={copyToken}
                className={`w-full rounded-lg py-2 font-medium text-white transition ${copied ? 'bg-green-500' : 'bg-violet-600 hover:bg-violet-700'}`}
              >
                {copied ? '복사됨!' : '토큰 복사'}
              </button>
            </div>
          )}

          {tab === 'email' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                가입된 이메일 주소로 직접 초대합니다.
              </p>
              <form onSubmit={handleEmailInvite} className="space-y-3">
                <input
                  type="email"
                  placeholder="초대할 이메일 주소"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); setEmailSuccess(''); }}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  autoFocus
                />
                {emailError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{emailError}</p>
                )}
                {emailSuccess && (
                  <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">{emailSuccess}</p>
                )}
                <button
                  type="submit"
                  disabled={!email.trim() || sending}
                  className="w-full rounded-lg bg-violet-600 py-2 font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {sending ? '초대 중...' : '초대하기'}
                </button>
              </form>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
