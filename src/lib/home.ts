import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { User } from '@/types';

export const ME_KEY = ['me'] as const;
export const FULL_USER_KEY = ['full-user'] as const;

/** Profil détaillé (matières, frais d'inscription, zone scolaire…) : édition du profil, recharge. */
export function useFullUser(enabled = true) {
  return useQuery({ queryKey: FULL_USER_KEY, queryFn: api.fullUser, enabled, staleTime: 30_000 });
}

/** Profil complet (solde d'heures, classes, référence…). */
export function useMe(enabled = true) {
  return useQuery({ queryKey: ME_KEY, queryFn: api.me, enabled, staleTime: 60_000 });
}

/** Séances des 30 prochains jours (et celle en cours), triées par date. */
export function useUpcomingSeances(user: User | null) {
  return useQuery({
    queryKey: ['seances', 'upcoming', user?.id],
    enabled: !!user && (user.role === 'STUDENT' || user.role === 'INSTRUCTOR'),
    refetchInterval: 60_000,
    queryFn: async () => {
      const from = new Date(Date.now() - 2 * 3600_000); // séance commencée il y a < 2 h
      const to = new Date(Date.now() + 30 * 24 * 3600_000);
      const all = await api.seances(user!, from, to);
      const now = Date.now();
      return all.filter((s) => (s.end ? +new Date(s.end) : +new Date(s.start) + 3600_000) > now);
    },
  });
}
