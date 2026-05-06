'use client';

import { useState } from 'react';
import { contisApi, type ContiSong } from '@/lib/api';

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'];

interface Props {
  cs: ContiSong;
  contiId: string;
  token: string;
  onSave: () => void;
  onClose: () => void;
}

export default function EditSongModal({ cs, contiId, token, onSave, onClose }: Props) {
  const [editKey, setEditKey] = useState(cs.key ?? '');
  const [editTempo, setEditTempo] = useState(cs.tempo != null ? String(cs.tempo) : '');
  const [editNote, setEditNote] = useState(cs.note ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await contisApi.updateSong(token, contiId, cs.id, {
        key: editKey || undefined,
        tempo: editTempo ? parseInt(editTempo) : null,
        note: editNote.trim() || undefined,
      });
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h2 className="mb-4 font-bold text-gray-900 dark:text-white">{cs.song.title} 설정</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">키</label>
            <select
              value={editKey}
              onChange={(e) => setEditKey(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">기본 ({cs.song.defaultKey ?? '없음'})</option>
              {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
              템포 (BPM)
              {cs.song.tempo && <span className="ml-1 text-xs text-gray-400">기본: {cs.song.tempo}</span>}
            </label>
            <input
              type="number"
              value={editTempo}
              onChange={(e) => setEditTempo(e.target.value)}
              placeholder="직접 입력"
              min={1}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">송폼</label>
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
              취소
            </button>
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-violet-600 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50">
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
