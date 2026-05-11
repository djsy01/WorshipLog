'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

export function RoomCreateModal({ onSubmit, onClose }: Props) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onSubmit(name.trim());
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">채팅방 만들기</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="채팅방 이름"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
              취소
            </button>
            <button type="submit" disabled={!name.trim() || creating} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
              {creating ? '생성 중...' : '만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
