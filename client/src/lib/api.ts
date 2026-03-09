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
