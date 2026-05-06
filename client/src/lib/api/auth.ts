import { request } from './request';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
}

export const authApi = {
  register: (body: { email: string; password: string; name: string }) =>
    request<{ message: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  verifyEmail: (token: string) =>
    request<AuthResponse>(`/auth/verify-email?token=${token}`, { method: 'POST' }),

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
