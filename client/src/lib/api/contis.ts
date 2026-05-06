import { request, authHeaders, API_URL } from './request';
import type { Song } from './songs';

export interface ContiSongSheet {
  id: string;
  url: string;
  orderIndex: number;
}

export interface ContiSong {
  id: string;
  contiId: string;
  songId: string;
  key: string | null;
  tempo: number | null;
  note: string | null;
  orderIndex: number;
  sheets: ContiSongSheet[];
  song: Song;
}

export interface Conti {
  id: string;
  title: string;
  description: string | null;
  worshipDate: string | null;
  teamId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  songs: ContiSong[];
  creator?: { id: string; name: string };
}

export const contisApi = {
  list: (token: string) =>
    request<Conti[]>('/contis', { headers: authHeaders(token) }),

  get: (token: string, id: string) =>
    request<Conti>(`/contis/${id}`, { headers: authHeaders(token) }),

  create: (token: string, body: { title: string; description?: string; worshipDate?: string }) =>
    request<Conti>('/contis', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  update: (token: string, id: string, body: Partial<{ title: string; description: string; worshipDate: string }>) =>
    request<Conti>(`/contis/${id}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) }),

  remove: (token: string, id: string) =>
    request<{ message: string }>(`/contis/${id}`, { method: 'DELETE', headers: authHeaders(token) }),

  addSong: (token: string, contiId: string, body: { songId: string; key?: string; note?: string }) =>
    request<ContiSong>(`/contis/${contiId}/songs`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  updateSong: (token: string, contiId: string, contiSongId: string, body: { key?: string; tempo?: number | null; note?: string }) =>
    request<ContiSong>(`/contis/${contiId}/songs/${contiSongId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) }),

  removeSong: (token: string, contiId: string, contiSongId: string) =>
    request<{ message: string }>(`/contis/${contiId}/songs/${contiSongId}`, { method: 'DELETE', headers: authHeaders(token) }),

  reorderSongs: (token: string, contiId: string, ids: string[]) =>
    request<Conti>(`/contis/${contiId}/songs/reorder`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ ids }) }),

  uploadContiSheet: async (token: string, contiId: string, contiSongId: string, file: File): Promise<ContiSong> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/contis/${contiId}/songs/${contiSongId}/sheet`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? '업로드 실패');
    return data as ContiSong;
  },

  deleteContiSheet: (token: string, contiId: string, contiSongId: string, sheetId: string) =>
    request<ContiSong>(`/contis/${contiId}/songs/${contiSongId}/sheet/${sheetId}`, { method: 'DELETE', headers: authHeaders(token) }),

  share: (token: string, contiId: string, teamId: string) =>
    request<Conti>(`/contis/${contiId}/share`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ teamId }) }),

  unshare: (token: string, contiId: string) =>
    request<Conti>(`/contis/${contiId}/share`, { method: 'DELETE', headers: authHeaders(token) }),
};
