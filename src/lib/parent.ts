import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
