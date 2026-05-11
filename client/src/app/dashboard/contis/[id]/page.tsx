'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { contisApi, orgsApi, type Conti, type ContiSong, type Organization } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import ConfirmModal from '@/components/ConfirmModal';
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
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleToggleShare = async (roomId: string, isShared: boolean) => {
    const token = getToken();
    if (!token) return;
    setLoadingRoomId(roomId);
    try {
      const updated = isShared
        ? await contisApi.unshareFrom(token, contiId, roomId)
        : await contisApi.share(token, contiId, roomId);
      setConti(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : '공유 처리 실패');
    } finally {
      setLoadingRoomId(null);
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

  const handleDelete = async () => {
    const token = getToken();
    if (!token) return;
    try {
      await contisApi.remove(token, contiId);
      router.replace('/dashboard/contis');
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
      setShowDeleteConfirm(false);
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
          <div className="print:hidden mb-6 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0" />
              </svg>
              콘티 목록으로 돌아가기
            </button>
            {conti.createdBy === myUserId && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-500 shadow-sm transition hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                삭제
              </button>
            )}
          </div>

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
            onUpdate={setConti}
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
      {showShareModal && conti && (
        <ShareModal
          orgs={myOrgs}
          myUserId={myUserId}
          sharedRoomIds={conti.shares.map((s) => s.roomId)}
          loadingRoomId={loadingRoomId}
          onToggle={handleToggleShare}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          title="콘티 삭제"
          message="이 콘티를 삭제하면 복구할 수 없습니다."
          confirmText="삭제"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
