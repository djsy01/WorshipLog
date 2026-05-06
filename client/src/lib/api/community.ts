import { request, authHeaders, API_URL } from './request';

export interface Post {
  id: string;
  userId: string;
  title: string | null;
  category: string;
  content: string;
  fileUrl: string | null;
  isAnonymous: boolean;
  meditationId: string | null;
  createdAt: string;
  updatedAt: string;
  author: string;
  isMine: boolean;
  meditation: { book: string; chapter: number; verse: number; content: string } | null;
  _count: { comments: number };
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  author: string;
  isMine: boolean;
}

export const uploadApi = {
  upload: async (token: string, file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? '업로드 실패');
    return data as { url: string };
  },
};

export const communityApi = {
  list: (token: string, category?: string, cursor?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString();
    return request<Post[]>(`/posts${qs ? `?${qs}` : ''}`, {
      headers: token ? authHeaders(token) : {},
    });
  },

  create: (
    token: string,
    body: { title?: string; category?: string; content: string; fileUrl?: string; isAnonymous?: boolean; meditationId?: string },
  ) =>
    request<Post>('/posts', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  remove: (token: string, postId: string) =>
    request<{ message: string }>(`/posts/${postId}`, { method: 'DELETE', headers: authHeaders(token) }),

  getComments: (token: string, postId: string) =>
    request<PostComment[]>(`/posts/${postId}/comments`, { headers: token ? authHeaders(token) : {} }),

  createComment: (token: string, postId: string, body: { content: string; isAnonymous?: boolean }) =>
    request<PostComment>(`/posts/${postId}/comments`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  removeComment: (token: string, postId: string, commentId: string) =>
    request<{ message: string }>(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE', headers: authHeaders(token) }),
};
