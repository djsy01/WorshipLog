import { request, authHeaders, API_URL } from './request';

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  defaultKey: string | null;
  tempo: number | null;
  lyrics: string | null;
  scriptureRef: string | null;
  sheetMusicUrl?: string | null;
  isPublic: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const songsApi = {
  list: (token: string, search?: string) =>
    request<Song[]>(`/songs${search ? `?search=${encodeURIComponent(search)}` : ''}`, {
      headers: token ? authHeaders(token) : {},
    }),

  get: (token: string, id: string) =>
    request<Song>(`/songs/${id}`, { headers: authHeaders(token) }),

  create: (token: string, body: Omit<Song, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) =>
    request<Song>('/songs', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  update: (token: string, id: string, body: Partial<Omit<Song, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>) =>
    request<Song>(`/songs/${id}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) }),

  remove: (token: string, id: string) =>
    request<{ message: string }>(`/songs/${id}`, { method: 'DELETE', headers: authHeaders(token) }),

  uploadSheet: async (token: string, songId: string, file: File): Promise<Song> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/songs/${songId}/sheet`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? '업로드 실패');
    return data as Song;
  },

  deleteSheet: (token: string, songId: string) =>
    request<Song>(`/songs/${songId}/sheet`, { method: 'DELETE', headers: authHeaders(token) }),
};
