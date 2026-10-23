import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { ChatData, Contact, Conversation, Message, User } from '@/types';

export const CHAT_KEY = ['chat'] as const;

/** Conversations + correspondants (GET /api/tchat/conversation). */
export function useChat(refetchInterval: number | false = false) {
  return useQuery({ queryKey: CHAT_KEY, queryFn: api.chat, refetchInterval });
}

/** Conversations triées par dernier message, du plus récent au plus ancien. */
export function sortedConversations(data?: ChatData): Conversation[] {
  const date = (c: Conversation) => (c.lastMessage ? +new Date(c.lastMessage.createdAt) : 0);
  return [...(data?.conversations ?? [])].sort((a, b) => date(b) - date(a));
}

/**
 * Correspondants avec qui démarrer une conversation : les profs d'un élève ou
 * les élèves d'un prof (ceux qui ont une séance ensemble). L'API renvoie déjà
 * uniquement ceux sans conversation.
 */
export function startableContacts(data: ChatData | undefined, user: User | null): Contact[] {
  if (!data || !user) return [];
  const list = user.role === 'STUDENT' ? data.instructors : data.students;
  return list
    .filter((c) => c.hasSeance)
    .sort((a, b) => a.firstName.localeCompare(b.firstName, 'fr'));
}

/** Ajoute un message envoyé dans le cache sans attendre le prochain rafraîchissement. */
export function useAppendMessage() {
  const queryClient = useQueryClient();
  return (message: Message, partnerId: number) => {
    queryClient.setQueryData<ChatData>(CHAT_KEY, (old) => {
      if (!old) return old;
      const existing = old.conversations.find((c) => c.partner.id === partnerId);
      if (existing) {
        if (existing.messages.some((m) => m.id === message.id)) return old;
        const updated: Conversation = {
          ...existing,
          messages: [message, ...existing.messages],
          lastMessage: message,
          totalMessages: existing.totalMessages + 1,
        };
        return { ...old, conversations: old.conversations.map((c) => (c === existing ? updated : c)) };
      }
      // Première conversation avec ce correspondant : il quitte la liste des contacts.
      const contact = [...old.instructors, ...old.students].find((c) => c.id === partnerId);
      if (!contact) return old;
      const { hasSeance: _s, hasMessage: _m, ...partner } = contact;
      const created: Conversation = {
        id: message.conversationId,
        partner,
        lastMessage: message,
        unreadCount: 0,
        totalMessages: 1,
        messages: [message],
        conversationIds: [message.conversationId],
      };
      return {
        conversations: [created, ...old.conversations],
        instructors: old.instructors.filter((c) => c.id !== partnerId),
        students: old.students.filter((c) => c.id !== partnerId),
      };
    });
  };
}
