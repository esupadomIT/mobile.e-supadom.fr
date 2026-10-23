// Modèles renvoyés par l'API admin.mobile.e-supadom.fr (schéma Prisma partagé).

export type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'COMMERCIAL' | 'CM' | 'USER';

/** GET /api/v1/auth/me */
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status?: string;
  profilePicture?: string | null;
}

/** Correspondant dans le chat (jamais l'objet User complet). */
export interface Partner {
  id: number;
  firstName: string;
  lastName: string;
  role: Role;
  gender?: string | null;
  reference?: string | null;
  profilePicture?: string | null;
}

export interface Attachment {
  id: number;
  fileUrl: string;
  fileType: string;
  fileName?: string | null;
}

export interface Message {
  id: number;
  text: string | null;
  isHtml: boolean;
  createdAt: string; // ISO 8601
  senderId: number;
  receiverId: number;
  conversationId: number;
  isRead: boolean;
  attachments?: Attachment[];
}

export interface Conversation {
  id: number;
  partner: Partner;
  lastMessage: Message | null;
  unreadCount: number;
  totalMessages: number;
  /** Du plus récent au plus ancien. */
  messages: Message[];
  conversationIds: number[];
}

/** Correspondant possible sans conversation (profs d'un élève, élèves d'un prof). */
export interface Contact extends Partner {
  hasSeance: boolean;
  hasMessage: boolean;
}

/** GET /api/tchat/conversation */
export interface ChatData {
  conversations: Conversation[];
  instructors: Contact[];
  students: Contact[];
}

/** POST /api/v1/auth/token */
export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
}
