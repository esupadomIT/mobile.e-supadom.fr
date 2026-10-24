import { FILES_URL } from '@/config';
import type { Message, Partner, Role } from '@/types';

const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/** Heure si c'est aujourd'hui, sinon date courte. */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? time.format(d) : day.format(d);
}

const longDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Séparateur de jour dans une discussion : « Aujourd'hui », « Hier », « lundi 12 octobre ». */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Aujourd’hui';
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  const label = longDay.format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

export function fullName(p: Pick<Partner, 'firstName' | 'lastName'>): string {
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
}

export function initials(p: Pick<Partner, 'firstName' | 'lastName'>): string {
  return `${p.firstName?.[0] ?? ''}${p.lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

export function roleLabel(role: Role): string {
  return role === 'INSTRUCTOR' ? 'Prof' : role === 'STUDENT' ? 'Élève' : 'e-Supadom';
}

/** Texte affichable : les messages types sont en HTML nettoyé côté serveur. */
export function messageText(m: Pick<Message, 'text' | 'isHtml'>): string {
  const text = m.text ?? '';
  if (!m.isHtml) return text;
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

/** Aperçu d'un message dans la liste des conversations. */
export function messagePreview(m: Message): string {
  const text = messageText(m);
  if (text) return text.replace(/\s+/g, ' ');
  const count = m.attachments?.length ?? 0;
  return count > 1 ? `${count} pièces jointes` : 'Pièce jointe';
}

export function fileUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${FILES_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
