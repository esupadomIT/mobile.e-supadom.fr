// Contrat de données attendu de l'API admin.mobile.e-supadom.fr (voir README).

export type Role = 'ELEVE' | 'PROF' | 'ADMIN';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string; // ISO 8601
  readAt?: string | null;
}

export interface Conversation {
  id: string;
  otherUser: Pick<User, 'id' | 'firstName' | 'lastName' | 'role' | 'avatarUrl'>;
  lastMessage?: Message | null;
  unreadCount: number;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
