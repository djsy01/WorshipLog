export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function request<T>(path: string, options?: RequestInit, retry = true): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  if (res.status === 401 && retry && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      const refreshed = await tryRefresh(refreshToken);
      if (refreshed) {
        const newToken = localStorage.getItem('accessToken')!;
        const newHeaders = { ...options?.headers, Authorization: `Bearer ${newToken}` };
        return request<T>(path, { ...options, headers: newHeaders }, false);
      }
      localStorage.clear();
      window.location.replace('/login');
      throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
    }
    throw new Error('로그인이 필요합니다.');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? '요청에 실패했습니다.');
  return data as T;
}

async function tryRefresh(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshToken}` },
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
