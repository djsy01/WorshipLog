import { readTokenClaims } from '../token-claims';
import { refreshAccess } from './session';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export function authHeaders(token: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (typeof options?.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const access = typeof window !== 'undefined' ? headers.get('Authorization')?.slice(7) : undefined;
  const expiresAt = access ? readTokenClaims(access)?.expiresAt : undefined;
  const expired = expiresAt !== undefined && expiresAt <= Date.now();
  const send = () => fetch(`${API_URL}${path}`, { ...options, headers });

  if (access && expired) {
    headers.set('Authorization', `Bearer ${await refreshAccess(API_URL, access)}`);
  }
  let response = await send();
  if (response.status === 401 && access && !expired) {
    headers.set('Authorization', `Bearer ${await refreshAccess(API_URL, access)}`);
    response = await send();
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? '요청에 실패했습니다.');
  return data as T;
}

export function uploadFile<T>(path: string, token: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  return request<T>(path, { method: 'POST', headers: authHeaders(token), body: form });
}
