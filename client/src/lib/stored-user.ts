import { useMemo, useSyncExternalStore } from 'react';
import type { AuthResponse } from './api/auth';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getStoredUser() {
  return readStorage('user');
}

function getAccessToken() {
  return readStorage('accessToken');
}

function getServerSnapshot() {
  return undefined;
}

export function useStoredUser() {
  const stored = useSyncExternalStore(subscribe, getStoredUser, getServerSnapshot);
  return useMemo(() => {
    if (!stored) return stored === undefined ? undefined : null;
    try {
      const user: Partial<AuthResponse['user']> | null = JSON.parse(stored);
      if (typeof user?.name !== 'string' || typeof user.id !== 'string') return null;
      return { id: user.id, name: user.name };
    } catch {
      return null;
    }
  }, [stored]);
}

export function useAccessToken() {
  return useSyncExternalStore(subscribe, getAccessToken, getServerSnapshot);
}
