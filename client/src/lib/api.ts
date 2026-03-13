const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

// Access Token 만료(401) 시 Refresh Token으로 자동 갱신 후 재시도
async function request<T>(
  path: string,
  options?: RequestInit,
  retry = true,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  if (res.status === 401 && retry && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      const refreshed = await tryRefresh(refreshToken);
      if (refreshed) {
        // 새 토큰으로 원래 요청 재시도
        const newToken = localStorage.getItem('accessToken')!;
        const newHeaders = {
          ...options?.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return request<T>(path, { ...options, headers: newHeaders }, false);
      }
    }
    // 갱신 실패 → 로그인 페이지로
    localStorage.clear();
    window.location.replace('/login');
    throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? '요청에 실패했습니다.');
  return data as T;
}

async function tryRefresh(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
}

export const authApi = {
  register: (body: { email: string; password: string; name: string }) =>
    request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyEmail: (token: string) =>
    request<AuthResponse>(`/auth/verify-email?token=${token}`, {
      method: 'POST',
    }),

  resendVerification: (email: string) =>
    request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  logout: (accessToken: string) =>
    request<void>('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};

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

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const songsApi = {
  list: (token: string, search?: string) =>
    request<Song[]>(`/songs${search ? `?search=${encodeURIComponent(search)}` : ''}`, {
      headers: authHeaders(token),
    }),

  get: (token: string, id: string) =>
    request<Song>(`/songs/${id}`, { headers: authHeaders(token) }),

  create: (token: string, body: Omit<Song, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) =>
    request<Song>('/songs', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),

  update: (token: string, id: string, body: Partial<Omit<Song, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>) =>
    request<Song>(`/songs/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),

  remove: (token: string, id: string) =>
    request<{ message: string }>(`/songs/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

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
    request<Song>(`/songs/${songId}/sheet`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
};

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  content: string;
}

export const bibleApi = {
  today: (token: string) =>
    request<BibleVerse>('/bible/today', { headers: authHeaders(token) }),
  random: (token: string) =>
    request<BibleVerse>('/bible/random', { headers: authHeaders(token) }),
  searchByRef: (token: string, ref: string) =>
    request<BibleVerse[]>(`/bible/search?ref=${encodeURIComponent(ref)}`, { headers: authHeaders(token) }),
};

export interface ContiSong {
  id: string;
  contiId: string;
  songId: string;
  key: string | null;
  note: string | null;
  orderIndex: number;
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
    request<Conti>('/contis', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),

  update: (token: string, id: string, body: Partial<{ title: string; description: string; worshipDate: string }>) =>
    request<Conti>(`/contis/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),

  remove: (token: string, id: string) =>
    request<{ message: string }>(`/contis/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  addSong: (token: string, contiId: string, body: { songId: string; key?: string; note?: string }) =>
    request<ContiSong>(`/contis/${contiId}/songs`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),

  updateSong: (token: string, contiId: string, contiSongId: string, body: { key?: string; note?: string }) =>
    request<ContiSong>(`/contis/${contiId}/songs/${contiSongId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),

  removeSong: (token: string, contiId: string, contiSongId: string) =>
    request<{ message: string }>(`/contis/${contiId}/songs/${contiSongId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  reorderSongs: (token: string, contiId: string, ids: string[]) =>
    request<Conti>(`/contis/${contiId}/songs/reorder`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ ids }),
    }),

  share: (token: string, contiId: string, teamId: string) =>
    request<Conti>(`/contis/${contiId}/share`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ teamId }),
    }),

  unshare: (token: string, contiId: string) =>
    request<Conti>(`/contis/${contiId}/share`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
};

export interface HistoryRecord {
  id: string;
  userId: string;
  contiId: string | null;
  worshipDate: string | null;
  createdAt: string;
  conti: Conti | null;
}

export const historyApi = {
  list: (token: string) =>
    request<HistoryRecord[]>('/history', { headers: authHeaders(token) }),

  get: (token: string, id: string) =>
    request<HistoryRecord>(`/history/${id}`, { headers: authHeaders(token) }),

  create: (token: string, body: { contiId?: string; worshipDate?: string }) =>
    request<HistoryRecord>('/history', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),

  remove: (token: string, id: string) =>
    request<{ message: string }>(`/history/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
};

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  tempo: number | null;
  previewUrl: string | null;
}

export const spotifyApi = {
  search: (token: string, q: string) =>
    request<SpotifyTrack[]>(`/spotify/search?q=${encodeURIComponent(q)}`, {
      headers: authHeaders(token),
    }),
};

export interface TeamMember {
  id: string;
  userId: string;
  role: 'leader' | 'member';
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  members: TeamMember[];
}

export const teamsApi = {
  list: (token: string) =>
    request<Team[]>('/teams', { headers: authHeaders(token) }),

  get: (token: string, id: string) =>
    request<Team>(`/teams/${id}`, { headers: authHeaders(token) }),

  create: (token: string, body: { name: string; description?: string }) =>
    request<Team>('/teams', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),

  remove: (token: string, id: string) =>
    request<{ message: string }>(`/teams/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  createInvite: (token: string, teamId: string) =>
    request<{ token: string; expiresAt: string }>(`/teams/${teamId}/invite`, {
      method: 'POST',
      headers: authHeaders(token),
    }),

  join: (token: string, inviteToken: string) =>
    request<Team>(`/teams/join/${inviteToken}`, {
      method: 'POST',
      headers: authHeaders(token),
    }),

  leave: (token: string, teamId: string) =>
    request<{ message: string }>(`/teams/${teamId}/leave`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  getContis: (token: string, teamId: string) =>
    request<Conti[]>(`/teams/${teamId}/contis`, { headers: authHeaders(token) }),

  kickMember: (token: string, teamId: string, memberId: string) =>
    request<{ message: string }>(`/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  transferLeader: (token: string, teamId: string, memberId: string) =>
    request<Team>(`/teams/${teamId}/members/${memberId}/transfer`, {
      method: 'PATCH',
      headers: authHeaders(token),
    }),
};
