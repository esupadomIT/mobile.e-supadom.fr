import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Section, SelectField } from '@/components/forms';
import { Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatIsoDay, hhmm, isoDay, SLOT_TIMES } from '@/lib/tz';
import { radius, useColors } from '@/theme';
import type { Disponibilite, WeeklySlots } from '@/types';

const DISPOS_KEY = ['disponibilites'] as const;

/** Onglet « Disponibilités » : saisie des créneaux (prof) ou des préférences hebdomadaires (élève). */
export default function DisposScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === 'INSTRUCTOR' ? <InstructorDispos userId={user.id} /> : <StudentDispos />;
}

// ─── Prof : créneaux datés ────────────────────────────────────────────────

function InstructorDispos({ userId }: { userId: number }) {
  const c = useColors();
  const qc = useQueryClient();
  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: [...DISPOS_KEY, userId],
    queryFn: () => api.disponibilites(userId),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteDisponibilite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISPOS_KEY }),
    onError: (e: Error) => Alert.alert('Suppression impossible', e.message),
  });

  // Créneaux à venir, groupés par jour (heure de Paris)
  const days = useMemo(() => {
    const now = Date.now();
    const groups = new Map<string, Disponibilite[]>();
    for (const d of data ?? []) {
      if (+new Date(d.endDate) <= now) continue;
      const day = isoDay(new Date(d.startDate));
      groups.set(day, [...(groups.get(day) ?? []), d]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const confirmDelete = (d: Disponibilite) =>
    Alert.alert('Supprimer ce créneau ?', `${formatIsoDay(isoDay(new Date(d.startDate)))} · ${hhmm(new Date(d.startDate))} – ${hhmm(new Date(d.endDate))}`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => remove.mutate(d.id) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}>
        <ScreenHeader title="Disponibilités" subtitle="Mon agenda">
          <Text style={styles.headerText}>Indiquez quand vous pouvez donner cours : l’équipe et vos élèves s’en servent pour planifier les séances.</Text>
        </ScreenHeader>
        <View style={styles.body}>
          <PrimaryButton title="Ajouter des disponibilités" onPress={() => router.push('/dispos-ajout')} />
          {error ? <Notice kind="error">{(error as Error).message}</Notice> : null}
          {isLoading ? <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} /> : null}
          {!isLoading && days.length === 0 && !error ? (
            <Section>
              <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
                <Ionicons name="calendar-outline" size={36} color={c.subtle} />
                <Text style={{ color: c.muted, textAlign: 'center' }}>Aucune disponibilité à venir.</Text>
              </View>
            </Section>
          ) : null}
          {days.map(([day, slots]) => (
            <Section key={day} title={formatIsoDay(day)}>
              {slots.map((d) => (
                <View key={d.id} style={[styles.slot, { backgroundColor: d.isAvailable ? c.primarySoft : '#FFEDD5' }]}>
                  <Ionicons name={d.isAvailable ? 'checkmark-circle' : 'close-circle'} size={20} color={d.isAvailable ? c.primary : '#C2410C'} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>
                      {hhmm(new Date(d.startDate))} – {hhmm(new Date(d.endDate))}
                    </Text>
                    <Text style={{ color: c.muted, fontSize: 12 }}>{d.isAvailable ? 'Disponible' : 'Indisponible / congés'}</Text>
                  </View>
                  <Pressable onPress={() => confirmDelete(d)} hitSlop={10} disabled={remove.isPending}>
                    <Ionicons name="trash-outline" size={20} color={c.danger} />
                  </Pressable>
                </View>
              ))}
            </Section>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Élève : préférences hebdomadaires ────────────────────────────────────

const WEEK: { key: string; label: string }[] = [
  { key: '1', label: 'Lundi' },
  { key: '2', label: 'Mardi' },
  { key: '3', label: 'Mercredi' },
  { key: '4', label: 'Jeudi' },
  { key: '5', label: 'Vendredi' },
  { key: '6', label: 'Samedi' },
  { key: '0', label: 'Dimanche' },
];
const TIME_OPTIONS = SLOT_TIMES.map((t) => ({ value: t, label: t }));

function nextSlot(slots: { start: string; end: string }[]) {
  const last = slots[slots.length - 1];
  if (!last) return { start: '17:00', end: '18:00' };
  const i = SLOT_TIMES.indexOf(last.end);
  return { start: SLOT_TIMES[Math.min(i, SLOT_TIMES.length - 2)], end: SLOT_TIMES[Math.min(i + 2, SLOT_TIMES.length - 1)] };
}

function StudentDispos() {
  const c = useColors();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({ queryKey: ['student-availability'], queryFn: api.studentAvailability });
  const [slots, setSlots] = useState<WeeklySlots>({});
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (data && !dirty) setSlots(data.slots ?? {});
  }, [data, dirty]);

  const save = useMutation({
    mutationFn: () => {
      // Créneaux triés par heure de début (l'API refuse les chevauchements)
      const clean: WeeklySlots = {};
      for (const [day, list] of Object.entries(slots)) {
        if (list.length) clean[day] = [...list].sort((a, b) => a.start.localeCompare(b.start));
      }
      return api.saveStudentAvailability(clean);
    },
    onSuccess: (res) => {
      setDirty(false);
      setMessage({ kind: 'success', text: `Disponibilités enregistrées (${res.generatedCount} créneaux jusqu’à la fin de l’année scolaire).` });
      qc.invalidateQueries({ queryKey: ['student-availability'] });
    },
    onError: (e: Error) => setMessage({ kind: 'error', text: e.message }),
  });

  const update = (day: string, list: { start: string; end: string }[]) => {
    setDirty(true);
    setMessage(null);
    setSlots((prev) => ({ ...prev, [day]: list }));
  };

  const total = Object.values(slots).reduce((n, l) => n + l.length, 0);
  const until = data?.schoolYearEnd ? formatIsoDay(isoDay(new Date(data.schoolYearEnd)), true) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}>
        <ScreenHeader title="Disponibilités" subtitle="Mes créneaux de la semaine">
          <Text style={styles.headerText}>
            Indiquez quand vous êtes disponible chaque semaine : ces créneaux sont répétés {until ? `jusqu’au ${until}` : 'toute l’année scolaire'}, hors vacances scolaires et jours fériés.
          </Text>
        </ScreenHeader>
        <View style={styles.body}>
          {error ? <Notice kind="error">{(error as Error).message}</Notice> : null}
          {isLoading ? <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} /> : null}
          {!isLoading &&
            WEEK.map(({ key, label }) => {
              const list = slots[key] ?? [];
              return (
                <Section
                  key={key}
                  title={label}
                  right={
                    <Pressable onPress={() => update(key, [...list, nextSlot(list)])} hitSlop={8} style={[styles.add, { backgroundColor: c.primarySoft }]}>
                      <Ionicons name="add" size={18} color={c.primary} />
                      <Text style={{ color: c.primary, fontWeight: '700' }}>Créneau</Text>
                    </Pressable>
                  }
                >
                  {list.length === 0 ? <Text style={{ color: c.subtle }}>Pas disponible</Text> : null}
                  {list.map((s, i) => (
                    <View key={i} style={styles.timeRow}>
                      <SelectField label="" value={s.start} options={TIME_OPTIONS} onChange={(v) => update(key, list.map((x, j) => (j === i ? { ...x, start: v } : x)))} />
                      <Ionicons name="arrow-forward" size={18} color={c.subtle} />
                      <SelectField label="" value={s.end} options={TIME_OPTIONS} onChange={(v) => update(key, list.map((x, j) => (j === i ? { ...x, end: v } : x)))} />
                      <Pressable onPress={() => update(key, list.filter((_, j) => j !== i))} hitSlop={10}>
                        <Ionicons name="trash-outline" size={20} color={c.danger} />
                      </Pressable>
                    </View>
                  ))}
                </Section>
              );
            })}
          {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}
          {!isLoading ? (
            <>
              <PrimaryButton title="Enregistrer mes disponibilités" onPress={() => save.mutate()} loading={save.isPending} disabled={total === 0} />
              {dirty ? (
                <SecondaryButton
                  title="Annuler les modifications"
                  onPress={() => {
                    setDirty(false);
                    setMessage(null);
                    setSlots(data?.slots ?? {});
                  }}
                />
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 14, marginTop: -8 },
  headerText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, padding: 12 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
