import { request, authHeaders } from './request';
import type { Conti } from './contis';

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
    request<HistoryRecord>('/history', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  remove: (token: string, id: string) =>
    request<{ message: string }>(`/history/${id}`, { method: 'DELETE', headers: authHeaders(token) }),
};
