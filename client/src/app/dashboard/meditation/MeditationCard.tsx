'use client';

import { useState } from 'react';
import { bibleApi, communityApi, teamsApi, type Meditation, type Team } from '@/lib/api';

function formatRef(m: Meditation) {
  return `${m.book} ${m.chapter}:${m.verse}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface Props {
  m: Meditation;
  teams: Team[];
  onNoteUpdate: (id: string, note: string) => void;
}

export default function MeditationCard({ m, teams, onNoteUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [noteInput, setNoteInput] = useState(m.note ?? '');
  const [sharing, setSharing] = useState(false);
  const [shareTab, setShareTab] = useState<'community' | 'team'>('community');
  const [shareAnon, setShareAnon] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? '');

  function getToken() {
    return localStorage.getItem('accessToken') ?? '';
  }

  async function saveNote() {
    await bibleApi.updateNote(getToken(), m.id, noteInput);
    onNoteUpdate(m.id, noteInput);
    setEditing(false);
  }

  function buildShareContent() {
    const verse = `📖 ${formatRef(m)}\n"${m.content}"`;
    return m.note ? `${verse}\n\n✏️ 묵상\n${m.note}` : verse;
  }

  async function shareToFeed() {
    await communityApi.create(getToken(), { content: buildShareContent(), isAnonymous: shareAnon, meditationId: m.id, category: 'meditation' });
    setSharing(false);
  }

  async function shareToTeam() {
    if (!selectedTeamId) return;
    await teamsApi.createPost(getToken(), selectedTeamId, { content: buildShareContent() });
    setSharing(false);
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
      <div className="absolute left-0 top-0 h-full w-1 bg-violet-400 dark:bg-violet-600" />
      <div className="px-6 py-5 pl-7">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(m.createdAt)}</span>
          <div className="flex gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
            <button
              onClick={() => { setEditing(true); setNoteInput(m.note ?? ''); }}
              className="rounded-lg px-2.5 py-1 text-xs text-violet-500 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/30 transition"
            >
              메모
            </button>
            <button
              onClick={() => { setSharing(true); setShareAnon(true); setShareTab('community'); }}
              className="rounded-lg px-2.5 py-1 text-xs text-indigo-500 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition"
            >
              공유
            </button>
          </div>
        </div>

        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 dark:text-violet-500">말씀</span>
          <span className="text-xs font-semibold text-violet-500 dark:text-violet-400">· {formatRef(m)}</span>
        </div>
        <div className="relative mb-4">
          <span className="absolute -top-2 -left-1 select-none text-4xl leading-none text-violet-200 dark:text-violet-800">"</span>
          <p className="font-lovespring pl-5 text-base leading-loose text-gray-800 dark:text-gray-200">{m.content}</p>
        </div>

        {m.note && !editing && (
          <>
            <div className="mb-1 flex items-center gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-amber-400" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400">묵상</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{m.note}</p>
          </>
        )}

        {editing && (
          <div className="mt-4 flex flex-col gap-2">
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="이 말씀으로 묵상한 내용을 적어보세요..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">취소</button>
              <button onClick={saveNote} className="text-xs bg-violet-600 text-white rounded-lg px-4 py-1.5 hover:bg-violet-700 transition">저장</button>
            </div>
          </div>
        )}

        {sharing && (
          <div className="mt-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 overflow-hidden">
            <div className="flex border-b border-indigo-200 dark:border-indigo-800">
              <button onClick={() => setShareTab('community')} className={`flex-1 py-2 text-xs font-semibold transition ${shareTab === 'community' ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>커뮤니티</button>
              <button onClick={() => setShareTab('team')} className={`flex-1 py-2 text-xs font-semibold transition ${shareTab === 'team' ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>팀스페이스</button>
            </div>
            <div className="flex flex-col gap-3 p-3">
              <div className="rounded-lg bg-white dark:bg-gray-900 px-3 py-2.5 text-xs leading-relaxed space-y-1.5">
                <p className="font-semibold text-violet-500 dark:text-violet-400">📖 {formatRef(m)}</p>
                <p className="text-gray-700 dark:text-gray-300">"{m.content}"</p>
                {m.note && (
                  <>
                    <p className="font-semibold text-amber-500 dark:text-amber-400 pt-1">✏️ 묵상</p>
                    <p className="text-gray-600 dark:text-gray-400">{m.note}</p>
                  </>
                )}
              </div>
              {shareTab === 'community' && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={shareAnon} onChange={(e) => setShareAnon(e.target.checked)} className="rounded" />
                    익명으로 공유
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setSharing(false)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">취소</button>
                    <button onClick={shareToFeed} className="text-xs bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 transition">올리기</button>
                  </div>
                </div>
              )}
              {shareTab === 'team' && (
                <div className="flex items-center justify-between gap-2">
                  {teams.length === 0 ? (
                    <p className="text-xs text-gray-400">참여 중인 팀이 없어요</p>
                  ) : (
                    <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none">
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => setSharing(false)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">취소</button>
                    <button onClick={shareToTeam} disabled={teams.length === 0} className="text-xs bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-40 transition">보내기</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
