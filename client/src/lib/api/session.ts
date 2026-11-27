import { readTokenClaims } from '../token-claims';

const sessionExpired = '세션이 만료되었습니다. 다시 로그인해주세요.';
let pendingRefresh: Promise<string> | undefined;

export function clearSession() {
  for (const key of ['accessToken', 'refreshToken', 'user']) localStorage.removeItem(key);
}

function expireSession() {
  clearSession();
  if (window.location.pathname !== '/login') window.location.replace('/login');
}

export async function refreshAccess(apiUrl: string, rejectedAccess: string) {
  const rotate = () => rotateSession(apiUrl, rejectedAccess);
  pendingRefresh ??= rotateWithLock(rotate)
    .finally(() => { pendingRefresh = undefined; });
  const access = await pendingRefresh;
  if (readTokenClaims(access)?.userId !== readTokenClaims(rejectedAccess)?.userId) {
    throw new Error(sessionExpired);
  }
  return access;
}

async function rotateWithLock(rotate: () => Promise<string>): Promise<string> {
  return await (navigator.locks?.request('worshiplog-auth-refresh', rotate) ?? rotate());
}

async function rotateSession(apiUrl: string, rejectedAccess: string) {
  const access = localStorage.getItem('accessToken');
  if (!access || readTokenClaims(access)?.userId !== readTokenClaims(rejectedAccess)?.userId) {
    throw new Error(sessionExpired);
  }
  const expiresAt = readTokenClaims(access)?.expiresAt ?? 0;
  if (access !== rejectedAccess && expiresAt > Date.now()) return access;

  const refresh = localStorage.getItem('refreshToken');
  try {
    if (!refresh) throw new Error(sessionExpired);
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refresh}` },
    });
    if (!response.ok) throw new Error(sessionExpired);
    const data = await response.json() as { accessToken: string; refreshToken: string };
    if (localStorage.getItem('refreshToken') !== refresh) throw new Error(sessionExpired);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  } catch {
    if (localStorage.getItem('refreshToken') === refresh) expireSession();
    throw new Error(sessionExpired);
  }
}
