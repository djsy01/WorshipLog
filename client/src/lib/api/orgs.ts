import { request, authHeaders, API_URL } from './request';
import type { Conti } from './contis';

export interface OrgMember {
  id: string;
  userId: string;
  role: 'leader' | 'sub_leader' | 'member';
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

export interface OrgRoom {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { messages: number };
}

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  members: OrgMember[];
  rooms: OrgRoom[];
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  fileUrl: string | null;
  createdAt: string;
  unreadCount: number;
  user: { id: string; name: string };
}

export interface PendingInvite {
  id: string;
  orgId: string;
  expiresAt: string;
  createdAt: string;
  org: { id: string; name: string; description: string | null };
  creator: { id: string; name: string };
}

export const orgsApi = {
  list: (token: string) =>
    request<Organization[]>('/organizations', { headers: authHeaders(token) }),

  create: (token: string, body: { name: string; description?: string }) =>
    request<Organization>('/organizations', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  remove: (token: string, orgId: string) =>
    request<{ message: string }>(`/organizations/${orgId}`, { method: 'DELETE', headers: authHeaders(token) }),

  createInvite: (token: string, orgId: string) =>
    request<{ token: string; expiresAt: string }>(`/organizations/${orgId}/invite`, { method: 'POST', headers: authHeaders(token) }),

  inviteByEmail: (token: string, orgId: string, email: string) =>
    request<{ message: string }>(`/organizations/${orgId}/invite-email`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ email }) }),

  getPendingInvites: (token: string) =>
    request<PendingInvite[]>('/organizations/invites', { headers: authHeaders(token) }),

  acceptInvite: (token: string, inviteId: string) =>
    request<Organization>(`/organizations/invites/${inviteId}/accept`, { method: 'POST', headers: authHeaders(token) }),

  rejectInvite: (token: string, inviteId: string) =>
    request<{ message: string }>(`/organizations/invites/${inviteId}/reject`, { method: 'POST', headers: authHeaders(token) }),

  join: (token: string, inviteToken: string) =>
    request<Organization>(`/organizations/join/${inviteToken}`, { method: 'POST', headers: authHeaders(token) }),

  leave: (token: string, orgId: string) =>
    request<{ message: string }>(`/organizations/${orgId}/leave`, { method: 'DELETE', headers: authHeaders(token) }),

  kickMember: (token: string, orgId: string, memberId: string) =>
    request<{ message: string }>(`/organizations/${orgId}/members/${memberId}`, { method: 'DELETE', headers: authHeaders(token) }),

  transferLeader: (token: string, orgId: string, memberId: string) =>
    request<Organization>(`/organizations/${orgId}/members/${memberId}/transfer`, { method: 'PATCH', headers: authHeaders(token) }),

  setSubLeader: (token: string, orgId: string, memberId: string, isSubLeader: boolean) =>
    request<Organization>(`/organizations/${orgId}/members/${memberId}/sub-leader`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ isSubLeader }) }),
};

export const roomsApi = {
  create: (token: string, body: { orgId: string; name: string; description?: string }) =>
    request<OrgRoom>('/rooms', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  remove: (token: string, roomId: string) =>
    request<{ message: string }>(`/rooms/${roomId}`, { method: 'DELETE', headers: authHeaders(token) }),

  getMessages: (token: string, roomId: string) =>
    request<Message[]>(`/rooms/${roomId}/messages`, { headers: authHeaders(token) }),

  createMessage: (token: string, roomId: string, body: { content: string; fileUrl?: string }) =>
    request<Message>(`/rooms/${roomId}/messages`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),

  deleteMessage: (token: string, roomId: string, messageId: string) =>
    request<{ message: string }>(`/rooms/${roomId}/messages/${messageId}`, { method: 'DELETE', headers: authHeaders(token) }),

  getContis: (token: string, roomId: string) =>
    request<Conti[]>(`/rooms/${roomId}/contis`, { headers: authHeaders(token) }),
};
