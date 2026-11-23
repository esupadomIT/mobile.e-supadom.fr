import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { dayLabel } from '@/lib/format';
import type { ChildLink, ChildSeance, ParentRelation } from '@/types';

/** Rôle Parent / Tuteur : enfants suivis, suivi d'un enfant, demandes côté élève. */

export const CHILDREN_KEY = ['parent', 'children'] as const;
export const childKey = (studentId: number) => ['parent', 'child', studentId] as const;
export const MY_PARENTS_KEY = ['me', 'parents'] as const;

export const RELATIONS: { value: ParentRelation; label: string }[] = [
  { value: 'MERE', label: 'Mère' },
  { value: 'PERE', label: 'Père' },
  { value: 'TUTEUR_LEGAL', label: 'Tuteur légal' },
  { value: 'AUTRE', label: 'Autre responsable' },
];

export const relationLabel = (r: ParentRelation | null | undefined) =>
  RELATIONS.find((x) => x.value === r)?.label ?? 'Responsable';

export function useChildren(enabled = true) {
  return useQuery({ queryKey: CHILDREN_KEY, queryFn: api.children, enabled, staleTime: 30_000 });
}

export function useChildOverview(studentId: number | null) {
  return useQuery({
    queryKey: childKey(studentId ?? 0),
    queryFn: () => api.childOverview(studentId!),
    enabled: !!studentId,
    staleTime: 30_000,
  });
}

export const childConversationsKey = (studentId: number) => ['parent', 'child', studentId, 'conversations'] as const;
export const childMessagesKey = (studentId: number, partnerId: number) =>
  ['parent', 'child', studentId, 'messages', partnerId] as const;

/** Échanges (lecture seule) de chaque enfant suivi avec ses professeurs. */
export function useChildrenConversations(studentIds: number[], refetchInterval: number | false = false) {
  return useQueries({
    queries: studentIds.map((id) => ({
      queryKey: childConversationsKey(id),
      queryFn: () => api.childConversations(id),
      refetchInterval,
    })),
  });
}

/** Messages entre un enfant et un de ses professeurs, `limit` derniers. */
export function useChildMessages(studentId: number, partnerId: number, limit: number, refetchInterval: number | false = false) {
  return useQuery({
    queryKey: [...childMessagesKey(studentId, partnerId), limit],
    queryFn: () => api.childMessages(studentId, partnerId, limit),
    refetchInterval,
    enabled: studentId > 0 && partnerId > 0,
    placeholderData: (previous) => previous,
  });
}

export function useMyParents(enabled = true) {
  return useQuery({ queryKey: MY_PARENTS_KEY, queryFn: api.myParents, enabled, staleTime: 60_000 });
}

/** Accepter / refuser une demande de suivi (vue élève). */
export function useAnswerParentInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId, accept }: { linkId: number; accept: boolean }) => api.answerParentInvite(linkId, accept),
    onSettled: () => qc.invalidateQueries({ queryKey: MY_PARENTS_KEY }),
  });
}

export const activeChildren = (links: ChildLink[] | undefined) =>
  (links ?? []).filter((l): l is Extract<ChildLink, { status: 'ACTIVE' }> => l.status === 'ACTIVE');

/** « Aujourd’hui · 17:30 – 19:00 · Mathématiques » */
export function seanceLine(s: ChildSeance): string {
  return [dayLabel(s.date), s.horaire, s.matiere].filter(Boolean).join(' · ');
}

/** 6,5 h → « 6h30 » (comme la maquette « 6h30 restantes »). */
export function hoursLabel(h: number | null | undefined): string {
  const v = Math.max(0, Number(h) || 0);
  const whole = Math.floor(v);
  const min = Math.round((v - whole) * 60);
  return min ? `${whole}h${String(min).padStart(2, '0')}` : `${whole}h`;
}

/** « 17/05/2012 » → « 2012-05-17 » (null si vide), ou 'invalid'. */
export function parseFrDate(input: string): string | null | 'invalid' {
  const v = input.trim();
  if (!v) return null;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  if (!m) return 'invalid';
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d || date > new Date()) return 'invalid';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Date ISO → « 17/05/2012 ». */
export function formatFrDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

/** « Inscrite depuis sept. 2024 » */
export function sinceLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `Inscrit(e) depuis ${d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
}
