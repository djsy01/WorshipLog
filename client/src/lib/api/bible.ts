import { request, authHeaders } from './request';

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  content: string;
}

export interface Meditation {
  id: string;
  userId: string;
  book: string;
  chapter: number;
  verse: number;
  content: string;
  note: string | null;
  createdAt: string;
}

export const bibleApi = {
  today: (token: string) =>
    request<BibleVerse & { meditationId: string }>('/bible/today', { headers: authHeaders(token) }),
  random: (token: string) =>
    request<BibleVerse>('/bible/random', { headers: authHeaders(token) }),
  publicRandom: () =>
    request<BibleVerse>('/bible/random'),
  searchByRef: (token: string, ref: string) =>
    request<BibleVerse[]>(`/bible/search?ref=${encodeURIComponent(ref)}`, { headers: authHeaders(token) }),
  getMeditations: (token: string) =>
    request<Meditation[]>('/bible/meditations', { headers: authHeaders(token) }),
  updateNote: (token: string, id: string, note: string) =>
    request<{ count: number }>(`/bible/meditations/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ note }),
    }),
};
