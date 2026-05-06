import { request, authHeaders } from './request';
import type { Conti } from './contis';

export interface CommunityPost {
  id: string;
  teamId: string;
  userId: string;
  title: string;
  content: string;
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string };
}

export interface TeamMember {
  id: string;
  userId: string;
  role: 'leader' | 'member';
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  members: TeamMember[];
}

export const teamsApi = {
  list: (token: string) =>
    request<Team[]>('/teams', { headers: authHeaders(token) }),

  get: (token: string, id: string) =>
    request<Team>(`/teams/${id}`, { headers: authHeaders(token) }),

  create: (token: string, body: { name: string; description?: string }) =>
    request<Team>('/teams', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  remove: (token: string, id: string) =>
    request<{ message: string }>(`/teams/${id}`, { method: 'DELETE', headers: authHeaders(token) }),

  createInvite: (token: string, teamId: string) =>
    request<{ token: string; expiresAt: string }>(`/teams/${teamId}/invite`, { method: 'POST', headers: authHeaders(token) }),

  join: (token: string, inviteToken: string) =>
    request<Team>(`/teams/join/${inviteToken}`, { method: 'POST', headers: authHeaders(token) }),

  leave: (token: string, teamId: string) =>
    request<{ message: string }>(`/teams/${teamId}/leave`, { method: 'DELETE', headers: authHeaders(token) }),

  getContis: (token: string, teamId: string) =>
    request<Conti[]>(`/teams/${teamId}/contis`, { headers: authHeaders(token) }),

  kickMember: (token: string, teamId: string, memberId: string) =>
    request<{ message: string }>(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE', headers: authHeaders(token) }),

  transferLeader: (token: string, teamId: string, memberId: string) =>
    request<Team>(`/teams/${teamId}/members/${memberId}/transfer`, { method: 'PATCH', headers: authHeaders(token) }),

  getPosts: (token: string, teamId: string) =>
    request<CommunityPost[]>(`/teams/${teamId}/posts`, { headers: authHeaders(token) }),

  createPost: (token: string, teamId: string, body: { content: string; fileUrl?: string }) =>
    request<CommunityPost>(`/teams/${teamId}/posts`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  deletePost: (token: string, teamId: string, postId: string) =>
    request<{ message: string }>(`/teams/${teamId}/posts/${postId}`, { method: 'DELETE', headers: authHeaders(token) }),
};
