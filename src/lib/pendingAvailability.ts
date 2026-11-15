import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';

import { api } from '@/lib/api';
import type { User, WeeklySlots } from '@/types';

/**
 * « Le bon rythme pour vous » (inscription élève) : le compte n'est pas encore activé
 * à l'inscription, les créneaux choisis sont donc gardés sur le téléphone puis
 * enregistrés (POST /student-availability) à la première connexion de ce compte.
 */
const key = (email: string) => `esupadom.pendingAvailability.${email.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}`;

export async function savePendingAvailability(email: string, slots: WeeklySlots) {
  await SecureStore.setItemAsync(key(email), JSON.stringify(slots)).catch(() => undefined);
}

/** À la connexion d'un élève : envoie les créneaux en attente (une seule fois). */
export function useApplyPendingAvailability(user: User | null) {
  useEffect(() => {
    if (!user?.email || (user.role !== 'STUDENT' && user.role !== 'USER')) return;
    const k = key(user.email);
    let cancelled = false;
    (async () => {
      const raw = await SecureStore.getItemAsync(k).catch(() => null);
      if (!raw || cancelled) return;
      try {
        await api.saveStudentAvailability(JSON.parse(raw) as WeeklySlots);
        await SecureStore.deleteItemAsync(k).catch(() => undefined);
      } catch {
        // Nouvelle tentative à la prochaine ouverture de l'app.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.role]);
}
