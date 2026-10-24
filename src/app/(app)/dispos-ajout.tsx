import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip, DateField, Section, SelectField } from '@/components/forms';
import { Notice, PrimaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDaysIso, isoDay, SLOT_TIMES, weekdayOfIso, zonedTimeToUtc } from '@/lib/tz';
import { useColors } from '@/theme';

const DAYS = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mer' },
  { id: 4, label: 'Jeu' },
  { id: 5, label: 'Ven' },
  { id: 6, label: 'Sam' },
  { id: 0, label: 'Dim' },
];
const TIME_OPTIONS = SLOT_TIMES.map((t) => ({ value: t, label: t }));
const MAX_DAYS = 366;

type Slot = { start: string; end: string };

/** Validation identique à la fenêtre « Ajouter des disponibilités » du site. */
function validate(start: string | null, end: string | null, days: number[], slots: Slot[]): string | null {
  if (!start || !end) return 'Veuillez sélectionner les dates de début et de fin.';
  if (start > end) return 'La date de fin doit être après la date de début.';
  if (!days.length) return 'Veuillez sélectionner au moins un jour de la semaine.';
  if (!slots.length) return 'Ajoutez au moins un créneau horaire.';
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.start >= s.end) return `Créneau ${i + 1} : l’heure de fin doit être après l’heure de début.`;
    for (let j = i + 1; j < slots.length; j++) {
      if (s.start === slots[j].start && s.end === slots[j].end) return `Le créneau ${i + 1} est identique au créneau ${j + 1}.`;
    }
    if (i < slots.length - 1 && s.end > slots[i + 1].start) return `Le créneau ${i + 1} doit se terminer avant le début du créneau ${i + 2}.`;
  }
  return null;
}

export default function AddDisposScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const today = isoDay();
  const [available, setAvailable] = useState(true);
  const [start, setStart] = useState<string | null>(today);
  const [end, setEnd] = useState<string | null>(addDaysIso(today, 6));
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [slots, setSlots] = useState<Slot[]>([{ start: '08:00', end: '09:00' }]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const toggleDay = (id: number) => setDays((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const setSlot = (i: number, patch: Partial<Slot>) => setSlots((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addSlot = () =>
    setSlots((list) => {
      const last = list[list.length - 1];
      const from = last ? Math.min(SLOT_TIMES.indexOf(last.end), SLOT_TIMES.length - 3) : 0;
      return [...list, { start: SLOT_TIMES[from], end: SLOT_TIMES[from + 2] }];
    });

  const submit = async () => {
    const invalid = validate(start, end, days, slots);
    if (invalid) return setError(invalid);
    if (!user || !start || !end) return;
    setError(null);

    // Créneaux à créer : chaque jour coché de la période, à l'heure de Paris
    const segments: { start: Date; end: Date }[] = [];
    let count = 0;
    for (let d = start; d <= end && count < MAX_DAYS; d = addDaysIso(d, 1), count++) {
      if (!days.includes(weekdayOfIso(d))) continue;
      const [y, m, day] = d.split('-').map(Number);
      for (const s of slots) {
        const [h1, m1] = s.start.split(':').map(Number);
        const [h2, m2] = s.end.split(':').map(Number);
        segments.push({ start: zonedTimeToUtc(y, m, day, h1, m1), end: zonedTimeToUtc(y, m, day, h2, m2) });
      }
    }
    const now = Date.now();
    const future = segments.filter((s) => s.start.getTime() > now);
    if (!future.length) return setError('Aucun créneau à venir dans cette période.');

    // Doublons exacts ignorés, comme sur le site
    let existing = new Set<string>();
    try {
      const list = await api.disponibilites(user.id);
      existing = new Set(list.map((a) => `${+new Date(a.startDate)}-${+new Date(a.endDate)}`));
    } catch {
      // liste indisponible : l'API fusionne de toute façon les chevauchements
    }
    const todo = future.filter((s) => !existing.has(`${s.start.getTime()}-${s.end.getTime()}`));
    const errors: string[] = [];
    setProgress({ done: 0, total: todo.length });
    for (let i = 0; i < todo.length; i++) {
      try {
        await api.addDisponibilite(todo[i].start.toISOString(), todo[i].end.toISOString(), available);
      } catch (e) {
        errors.push((e as Error).message);
      }
      setProgress({ done: i + 1, total: todo.length });
    }
    setProgress(null);
    qc.invalidateQueries({ queryKey: ['disponibilites'] });
    if (errors.length) {
      setError(`${todo.length - errors.length} créneau(x) ajouté(s), ${errors.length} en erreur : ${errors[0]}`);
      return;
    }
    router.back();
  };

  const busy = progress !== null;

  return (
    <>
      <Stack.Screen options={{ title: 'Ajouter des disponibilités' }} />
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Section title="Je souhaite déclarer">
          <View style={styles.wrap}>
            <Chip label="Des disponibilités" selected={available} onPress={() => setAvailable(true)} />
            <Chip label="Une indisponibilité / congés" tone="warning" selected={!available} onPress={() => setAvailable(false)} />
          </View>
        </Section>

        <Section title="Période">
          <View style={styles.row}>
            <DateField
              label="Du"
              value={start}
              min={today}
              onChange={(v) => {
                setStart(v);
                if (end && v > end) setEnd(v);
              }}
            />
            <DateField label="Au" value={end} min={start ?? today} max={start ? addDaysIso(start, MAX_DAYS - 1) : undefined} onChange={setEnd} />
          </View>
        </Section>

        <Section title="Jours de la semaine">
          <View style={styles.wrap}>
            {DAYS.map((d) => (
              <Chip key={d.id} label={d.label} selected={days.includes(d.id)} onPress={() => toggleDay(d.id)} />
            ))}
          </View>
        </Section>

        <Section
          title="Créneaux horaires"
          subtitle="Heure de Paris"
          right={
            <Pressable onPress={addSlot} hitSlop={8} style={[styles.add, { backgroundColor: c.primarySoft }]}>
              <Ionicons name="add" size={18} color={c.primary} />
              <Text style={{ color: c.primary, fontWeight: '700' }}>Ajouter</Text>
            </Pressable>
          }
        >
          {slots.map((s, i) => (
            <View key={i} style={styles.row}>
              <Text style={{ color: c.muted, fontWeight: '700', width: 18 }}>{i + 1}</Text>
              <SelectField label="" value={s.start} options={TIME_OPTIONS} onChange={(v) => setSlot(i, { start: v })} />
              <Ionicons name="arrow-forward" size={18} color={c.subtle} />
              <SelectField label="" value={s.end} options={TIME_OPTIONS} onChange={(v) => setSlot(i, { end: v })} />
              <Pressable onPress={() => setSlots((list) => list.filter((_, j) => j !== i))} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={c.danger} />
              </Pressable>
            </View>
          ))}
        </Section>

        {error ? <Notice kind="error">{error}</Notice> : null}
        <PrimaryButton
          title={busy ? `Enregistrement… ${progress.done}/${progress.total}` : 'Enregistrer'}
          onPress={submit}
          loading={busy && progress.total === 0}
          disabled={busy}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
