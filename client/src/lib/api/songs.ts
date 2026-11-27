import { request, authHeaders, uploadFile } from './request';

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

type SongInput = Pick<Song, 'title' | 'artist' | 'defaultKey' | 'tempo' | 'lyrics' | 'scriptureRef' | 'isPublic'>;

export const songsApi = {
  list: (token: string, search?: string) =>
    request<Song[]>(`/songs${search ? `?search=${encodeURIComponent(search)}` : ''}`, {
      headers: token ? authHeaders(token) : {},
    }),

  get: (token: string, id: string) =>
    request<Song>(`/songs/${id}`, { headers: authHeaders(token) }),

  create: (token: string, body: SongInput) =>
    request<Song>('/songs', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  update: (token: string, id: string, body: Partial<SongInput>) =>
    request<Song>(`/songs/${id}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) }),

  remove: (token: string, id: string) =>
    request<{ message: string }>(`/songs/${id}`, { method: 'DELETE', headers: authHeaders(token) }),

  uploadSheet: (token: string, songId: string, file: File) =>
    uploadFile<Song>(`/songs/${songId}/sheet`, token, file),

  deleteSheet: (token: string, songId: string) =>
    request<Song>(`/songs/${songId}/sheet`, { method: 'DELETE', headers: authHeaders(token) }),
};
