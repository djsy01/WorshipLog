export function readTokenClaims(token: string) {
  const segment = token.split('.')[1];
  if (!segment) return null;

  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const claims: { sub?: unknown; role?: unknown; exp?: unknown } | null = JSON.parse(atob(base64));
    if (typeof claims?.sub !== 'string') return null;
    return {
      userId: claims.sub,
      role: claims.role === 'admin' ? 'admin' : 'user',
      expiresAt: typeof claims.exp === 'number' ? claims.exp * 1000 : undefined,
    };
  } catch {
    return null;
  }
}
