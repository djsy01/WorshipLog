'use client';

import { useState } from 'react';
import { contisApi, type Conti, type Team } from '@/lib/api';

interface Props {
  conti: Conti;
  contiId: string;
  token: string;
  myUserId: string;
  myTeams: Team[];
  sharing: boolean;
  onUpdate: (c: Conti) => void;
  onUnshare: () => void;
  onShowShare: () => void;
}

export default function ContiInfoCard({ conti, contiId, token, myUserId, myTeams, sharing, onUpdate, onUnshare, onShowShare }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: conti.title, description: conti.description ?? '', worshipDate: conti.worshipDate?.split('T')[0] ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await contisApi.update(token, contiId, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        worshipDate: form.worshipDate || undefined,
      });
      onUpdate(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700 sm:p-6">
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
      {editing ? (
        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            required
          />
          <input
            type="date"
            value={form.worshipDate}
            onChange={(e) => setForm((f) => ({ ...f, worshipDate: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="메모"
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
              취소
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50">
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{conti.title}</h1>
            {conti.worshipDate && (
              <p className="mt-1 text-base text-violet-500 dark:text-violet-400">
                {new Date(conti.worshipDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
            {conti.description && <p className="mt-2 text-gray-500 dark:text-gray-400">{conti.description}</p>}
            {conti.teamId && (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                  팀 공유 중
                </span>
                {conti.createdBy === myUserId && (
                  <button onClick={onUnshare} disabled={sharing} className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50">
                    공유 해제
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {conti.createdBy === myUserId && !conti.teamId && myTeams.length > 0 && (
              <button onClick={onShowShare} className="print:hidden rounded-lg px-2.5 py-1.5 text-xs font-medium text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20">
                팀 공유
              </button>
            )}
            <button onClick={() => setEditing(true)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
