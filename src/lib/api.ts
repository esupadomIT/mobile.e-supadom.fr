import { API_URL } from '@/config';
import type { ChatData, Message, MessagesPage, TokenResponse, User } from '@/types';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Appelé quand l'API répond 401 (jeton expiré) : l'AuthProvider déconnecte. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Pas de connexion. Vérifie ton accès à Internet.');
  }

  if (res.status === 401 && authToken) onUnauthorized?.();

  if (!res.ok) {
    let message = 'La demande n’a pas pu aboutir. Merci de réessayer dans quelques instants.';
    try {
      const body = await res.json();
      // L'API renvoie selon les routes { error }, { message } ou un tableau de messages (validation).
      const raw = body?.error ?? body?.message;
      if (typeof raw === 'string') message = raw;
      else if (Array.isArray(raw) && typeof raw[0] === 'string') message = raw[0];
    } catch {
      // corps non JSON : message par défaut
    }
    throw new ApiError(res.status, message);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>('/v1/auth/token', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/v1/auth/me'),

  /** Conversations (dernier message seulement) + correspondants possibles. */
  chat: () => request<ChatData>('/tchat/conversation?lite=1'),
  /** Messages échangés avec un correspondant, du plus récent au plus ancien. */
  messages: (partnerId: number, limit = 50) =>
    request<MessagesPage>(`/tchat/messages?partnerId=${partnerId}&limit=${limit}`),
  sendMessage: (receiverId: number, text: string) =>
    request<Message>('/tchat/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, text }),
    }),
  markAsRead: (conversationId: number) =>
    request<{ message: string }>('/tchat/markAsRead', {
      method: 'POST',
      body: JSON.stringify({ conversationId }),
    }),

  // Routes à créer côté API (table DeviceToken dans le schéma partagé).
  registerDevice: (token: string, platform: string) =>
    request<void>('/v1/devices', { method: 'POST', body: JSON.stringify({ token, platform }) }),
  unregisterDevice: (token: string) =>
    request<void>(`/v1/devices/${encodeURIComponent(token)}`, { method: 'DELETE' }),
};
