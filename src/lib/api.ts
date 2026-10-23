import { API_URL } from '@/config';
import type { Conversation, LoginResponse, Message, User } from '@/types';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Appelé quand l'API répond 401 (token expiré) : l'AuthProvider déconnecte. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && authToken) onUnauthorized?.();

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message ?? message;
    } catch {
      // corps non JSON : on garde le message par défaut
    }
    throw new ApiError(res.status, message);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/me'),

  conversations: () => request<Conversation[]>('/conversations'),
  messages: (conversationId: string, before?: string) =>
    request<Message[]>(
      `/conversations/${conversationId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`,
    ),
  sendMessage: (conversationId: string, content: string) =>
    request<Message>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  markRead: (conversationId: string) =>
    request<void>(`/conversations/${conversationId}/read`, { method: 'POST' }),

  registerDevice: (token: string, platform: string) =>
    request<void>('/devices', { method: 'POST', body: JSON.stringify({ token, platform }) }),
  unregisterDevice: (token: string) =>
    request<void>(`/devices/${encodeURIComponent(token)}`, { method: 'DELETE' }),
};
