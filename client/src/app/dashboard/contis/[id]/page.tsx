'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { contisApi, orgsApi, type Conti, type ContiSong, type Organization } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import ContiPrintLayout from './ContiPrintLayout';
import ContiInfoCard from './ContiInfoCard';
import ContiSongList from './ContiSongList';
import AddSongPanel from './AddSongPanel';
import EditSongModal from './EditSongModal';
import ShareModal from './ShareModal';

export default function ContiEditPage() {
  const router = useRouter();
  const params = useParams();
  const contiId = params.id as string;

  const [conti, setConti] = useState<Conti | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddSong, setShowAddSong] = useState(false);
  const [editingCs, setEditingCs] = useState<ContiSong | null>(null);
  const [myUserId, setMyUserId] = useState('');
  const [myOrgs, setMyOrgs] = useState<Organization[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharing, setSharing] = useState(false);

  const getToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.replace('/login'); return null; }
    return token;
  }, [router]);

  const loadConti = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await contisApi.get(token, contiId);
      setConti(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [getToken, contiId]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setMyUserId((JSON.parse(stored) as { id: string }).id);
    const token = localStorage.getItem('accessToken');
    if (token) orgsApi.list(token).then(setMyOrgs).catch(() => null);
    loadConti();
  }, [loadConti]);

  const handleShare = async (roomId: string) => {
    const token = getToken();
    if (!token) return;
    setSharing(true);
    try {
      const updated = await contisApi.share(token, contiId, roomId);
      setConti(updated);
      setShowShareModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '공유 실패');
    } finally {
      setSharing(false);
    }
  };

  const handleUnshare = async () => {
    const token = getToken();
    if (!token) return;
    setSharing(true);
    try {
      const updated = await contisApi.unshare(token, contiId);
      setConti(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : '공유 해제 실패');
    } finally {
      setSharing(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!conti) return;
    const token = getToken();
    if (!token) return;
    const songs = [...conti.songs];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= songs.length) return;
    [songs[index], songs[swapIndex]] = [songs[swapIndex], songs[index]];
    setConti({ ...conti, songs });
    try {
      const updated = await contisApi.reorderSongs(token, contiId, songs.map((s) => s.id));
      setConti(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : '순서 변경 실패');
      loadConti();
    }
  };

  const handleRemoveSong = async (contiSongId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await contisApi.removeSong(token, contiId, contiSongId);
      await loadConti();
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const handlePrint = () => {
    const prev = document.title;
    document.title = conti?.title ?? 'WorshipLog';
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    window.addEventListener('afterprint', () => {
      document.title = prev;
      if (isDark) {
        root.style.backgroundColor = '#030712';
        requestAnimationFrame(() => { root.style.backgroundColor = ''; });
      }
    }, { once: true });
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppHeader page="콘티 편집" />
        <div className="flex justify-center py-20 text-gray-400">불러오는 중...</div>
      </div>
    );
  }

  if (!conti) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppHeader page="콘티 편집" />
        <div className="flex justify-center py-20 text-red-400">{error || '콘티를 찾을 수 없습니다.'}</div>
      </div>
    );
  }

  const token = localStorage.getItem('accessToken') ?? '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <ContiPrintLayout conti={conti} />
      <div className="print:hidden">
        <AppHeader page="콘티 편집" />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          <button
            onClick={() => router.back()}
            className="print:hidden mb-6 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0" />
            </svg>
            콘티 목록으로 돌아가기
          </button>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
              <button onClick={() => setError('')} className="ml-2 underline">닫기</button>
            </div>
          )}

          <ContiInfoCard
            conti={conti}
            contiId={contiId}
            token={token}
            myUserId={myUserId}
            myOrgs={myOrgs}
            sharing={sharing}
            onUpdate={setConti}
            onUnshare={handleUnshare}
            onShowShare={() => setShowShareModal(true)}
          />
          <ContiSongList
            conti={conti}
            contiId={contiId}
            token={token}
            onMove={handleMove}
            onRemoveSong={handleRemoveSong}
            onEditSong={setEditingCs}
            onOpenAddSong={() => setShowAddSong(true)}
            onPrint={handlePrint}
            onSheetChange={loadConti}
          />
        </main>
      </div>

      {showAddSong && (
        <AddSongPanel
          contiId={contiId}
          token={token}
          addedSongIds={new Set(conti.songs.map((cs) => cs.songId))}
          onAdd={loadConti}
          onClose={() => setShowAddSong(false)}
        />
      )}
      {editingCs && (
        <EditSongModal
          cs={editingCs}
          contiId={contiId}
          token={token}
          onSave={() => { loadConti(); setEditingCs(null); }}
          onClose={() => setEditingCs(null)}
        />
      )}
      {showShareModal && (
        <ShareModal
          orgs={myOrgs}
          sharing={sharing}
          onShare={handleShare}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
