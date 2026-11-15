import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountScreen } from '@/components/AccountScreen';
import { Card, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api, ApiError, DURATION_HOURS } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ME_KEY, useMe } from '@/lib/home';
import { formatIsoDay, hhmm, isoDay } from '@/lib/tz';
import { fonts, radius, typography as t, useColors } from '@/theme';
import type { Disponibilite, Partner } from '@/types';

/**
 * Maquette « 📆 Planning Élève & Parent » : « Réserver un cours » puis « Cours réservé ! ».
 * Créneaux : disponibilités réelles du prof (au moins 2 h à l'avance, 14 jours).
 * La réservation débite le solde comme une séance créée par le prof (POST /seance/v1/reserver).
 */

const DURATIONS = [
  { id: '1', label: '1h' },
  { id: '4', label: '1h30' },
  { id: '5', label: '2h' },
  { id: '3', label: '30 min' },
];
const STEP = 30 * 60_000;
const DAYS_AHEAD = 14;

type Slot = { start: Date; day: string };
type Warning = { type: string; holidays?: { label?: string }[] };

function candidateSlots(dispos: Disponibilite[], hours: number): Slot[] {
  const min = Date.now() + 2 * 3600_000;
  const max = Date.now() + DAYS_AHEAD * 86400_000;
  const out: Slot[] = [];
  const seen = new Set<number>();
  for (const d of dispos) {
    if (!d.isAvailable) continue;
    const end = Date.parse(d.endDate);
    let t0 = Math.max(Date.parse(d.startDate), min);
    t0 = Math.ceil(t0 / STEP) * STEP;
    for (let t1 = t0; t1 + hours * 3600_000 <= end && t1 <= max; t1 += STEP) {
      if (seen.has(t1)) continue;
      seen.add(t1);
      const start = new Date(t1);
      out.push({ start, day: isoDay(start) });
    }
  }
  return out.sort((a, b) => +a.start - +b.start);
}

const frDate = (iso: string) => iso.split('-').reverse().join('/');
const fullName = (p: Partner) => `${p.firstName} ${p.lastName}`.trim();

function warningText(w: Warning) {
  if (w.type === 'holiday') return `Jour férié ou vacances scolaires : ${(w.holidays ?? []).map((h) => h.label).filter(Boolean).join(', ') || 'période particulière'}.`;
  if (w.type === 'students') return 'Ce créneau est en dehors de vos disponibilités habituelles.';
  return 'Ce créneau demande une confirmation.';
}

export default function ReserveScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const me = useMe();
  const params = useLocalSearchParams<{ instructorId?: string }>();
  const email = me.data?.email ?? user?.email ?? '';

  const profs = useQuery({ queryKey: ['reserve', 'instructors', email], queryFn: () => api.rechargeInstructors(email), enabled: !!email });
  const [profId, setProfId] = useState<number | null>(params.instructorId ? Number(params.instructorId) : null);
  const prof = (profs.data ?? []).find((p) => p.id === profId) ?? (profs.data?.length === 1 ? profs.data[0] : undefined);
  const selectedProfId = prof?.id ?? null;

  const [duration, setDuration] = useState('4');
  const dispos = useQuery({
    queryKey: ['reserve', 'dispos', selectedProfId],
    queryFn: () => api.disponibilites(selectedProfId!),
    enabled: selectedProfId != null,
  });
  const slots = useMemo(() => candidateSlots(dispos.data ?? [], DURATION_HOURS[duration]), [dispos.data, duration]);
  const days = [...new Set(slots.map((s) => s.day))];
  const [slot, setSlot] = useState<Slot | null>(null);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceIssue, setBalanceIssue] = useState(false);
  const [warnings, setWarnings] = useState<Warning[] | null>(null);
  const [done, setDone] = useState<Slot | null>(null);

  const book = async (force = false) => {
    if (!slot || !selectedProfId) return;
    setSending(true);
    setError(null);
    setBalanceIssue(false);
    try {
      await api.reserveSeance({ instructorId: selectedProfId, date: frDate(slot.day), horaire: hhmm(slot.start), duration, force });
      setWarnings(null);
      setDone(slot);
      void qc.invalidateQueries({ queryKey: ['seances'] });
      void qc.invalidateQueries({ queryKey: ME_KEY });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && Array.isArray(e.body?.warnings)) {
        setWarnings(e.body.warnings);
      } else if (e instanceof ApiError && e.body?.type === 'balance') {
        setBalanceIssue(true);
        setError(`Solde insuffisant pour ce cours${e.body?.details?.students?.[0]?.missing ? ` (il manque ${e.body.details.students[0].missing})` : ''}.`);
      } else if (e instanceof ApiError && e.body?.type === 'instructor') {
        setError('Ce créneau vient d’être pris. Choisissez-en un autre.');
        void dispos.refetch();
      } else {
        setError(e instanceof Error ? e.message : 'La réservation n’a pas pu aboutir.');
      }
    } finally {
      setSending(false);
    }
  };

  // ─── « Cours réservé ! » ───────────────────────────────────────────────
  if (done && prof) {
    const end = new Date(+done.start + DURATION_HOURS[duration] * 3600_000);
    return (
      <AccountScreen title="Cours réservé !" subtitle="Votre séance est ajoutée à votre planning.">
        <View style={[styles.success, { backgroundColor: c.accentSoft }]}>
          <Ionicons name="checkmark-circle" size={34} color={c.onAccent} />
          <Text style={[t.cardTitle, { color: c.text, textAlign: 'center' }]}>
            {formatIsoDay(done.day).replace(/^./, (ch) => ch.toUpperCase())} · {hhmm(done.start)} – {hhmm(end)}
          </Text>
          <Text style={[t.cardText, { color: c.muted, textAlign: 'center' }]}>Avec {fullName(prof)} · {DURATIONS.find((d) => d.id === duration)?.label}</Text>
        </View>
        <Card tone="info">
          <Text style={[t.cardTitle, { color: c.text }]}>Et maintenant ?</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            Vous recevez un e-mail de confirmation avec le lien Google Meet. Le cours a été déduit de votre solde.
          </Text>
        </Card>
        <PrimaryButton title="Voir mon planning" onPress={() => router.navigate('/planning')} />
        <SecondaryButton title={`Écrire à ${prof.firstName}`} onPress={() => router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(prof.id) } })} />
      </AccountScreen>
    );
  }

  return (
    <AccountScreen title="Réserver un cours" subtitle={prof ? `Choisissez un créneau avec ${fullName(prof)}.` : 'Choisissez votre professeur et un créneau.'}>
      {profs.isLoading ? <ActivityIndicator color={c.primary} /> : null}
      {profs.isError ? (
        <View style={{ gap: 12 }}>
          <Notice kind="error">La liste de vos professeurs est momentanément indisponible.</Notice>
          <SecondaryButton title="Réessayer" onPress={() => void profs.refetch()} />
        </View>
      ) : null}
      {profs.data && profs.data.length === 0 ? (
        <Card>
          <Text style={[t.cardTitle, { color: c.text }]}>Aucun professeur pour le moment</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            La réservation est possible avec un professeur qui vous a déjà donné cours ces deux derniers mois.
          </Text>
          <SecondaryButton title="Trouver un prof" onPress={() => router.navigate('/trouver-prof')} />
        </Card>
      ) : null}

      {(profs.data?.length ?? 0) > 1 ? (
        <View style={{ gap: 8 }}>
          <Text style={[t.caption, { color: c.text, fontSize: 13 }]}>Professeur</Text>
          <View style={styles.wrap}>
            {profs.data!.map((p) => (
              <Chip key={p.id} label={fullName(p)} selected={p.id === selectedProfId} onPress={() => { setProfId(p.id); setSlot(null); setWarnings(null); }} />
            ))}
          </View>
        </View>
      ) : null}

      {prof ? (
        <>
          <View style={{ gap: 8 }}>
            <Text style={[t.caption, { color: c.text, fontSize: 13 }]}>Durée</Text>
            <View style={styles.wrap}>
              {DURATIONS.map((d) => (
                <Chip key={d.id} label={d.label} selected={duration === d.id} onPress={() => { setDuration(d.id); setSlot(null); setWarnings(null); }} />
              ))}
            </View>
          </View>

          {dispos.isLoading ? <ActivityIndicator color={c.primary} /> : null}
          {dispos.isError ? <Notice kind="error">Les disponibilités du professeur sont momentanément indisponibles.</Notice> : null}
          {dispos.data && slots.length === 0 ? (
            <Card>
              <Text style={[t.cardTitle, { color: c.text }]}>Pas de créneau libre</Text>
              <Text style={[t.cardText, { color: c.muted }]}>
                {prof.firstName} n’a pas de disponibilité sur les {DAYS_AHEAD} prochains jours pour cette durée. Vous pouvez lui écrire pour convenir d’un horaire.
              </Text>
              <SecondaryButton title={`Écrire à ${prof.firstName}`} onPress={() => router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(prof.id) } })} />
            </Card>
          ) : null}

          {days.map((day) => (
            <View key={day} style={{ gap: 8 }}>
              <Text style={[t.cardTitle, { color: c.text, fontSize: 14 }]}>{formatIsoDay(day).replace(/^./, (ch) => ch.toUpperCase())}</Text>
              <View style={styles.wrap}>
                {slots
                  .filter((s) => s.day === day)
                  .map((s) => (
                    <Chip key={+s.start} label={hhmm(s.start)} selected={!!slot && +slot.start === +s.start} onPress={() => { setSlot(s); setWarnings(null); setError(null); }} />
                  ))}
              </View>
            </View>
          ))}

          {slot ? (
            <Card tone="info">
              <Text style={[t.cardTitle, { color: c.text }]}>
                {formatIsoDay(slot.day).replace(/^./, (ch) => ch.toUpperCase())} · {hhmm(slot.start)} – {hhmm(new Date(+slot.start + DURATION_HOURS[duration] * 3600_000))}
              </Text>
              <Text style={[t.cardText, { color: c.muted }]}>
                {fullName(prof)} · {DURATIONS.find((d) => d.id === duration)?.label} · Google Meet
              </Text>
              <Text style={[t.captionRegular, { color: c.muted }]}>Le cours sera déduit de votre solde d’heures.</Text>
            </Card>
          ) : null}

          {warnings ? (
            <View style={[styles.warn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Text style={[t.cardTitle, { color: c.text, fontSize: 14 }]}>À vérifier avant de réserver</Text>
              {warnings.map((w, i) => (
                <Text key={i} style={[t.cardText, { color: c.muted }]}>• {warningText(w)}</Text>
              ))}
            </View>
          ) : null}
          {error ? <Notice kind="error">{error}</Notice> : null}
          {balanceIssue ? <SecondaryButton title="Recharger mon compte" onPress={() => router.push('/recharge')} /> : null}

          <PrimaryButton
            title={warnings ? 'Réserver quand même' : 'Réserver ce créneau'}
            onPress={() => void book(!!warnings)}
            loading={sending}
            disabled={!slot}
          />
        </>
      ) : null}
    </AccountScreen>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primary : pressed ? c.surfaceAlt : c.surface },
      ]}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: selected ? c.onPrimary : c.text }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 9 },
  success: { borderRadius: radius.lg, padding: 22, alignItems: 'center', gap: 8 },
  warn: { borderWidth: 1, borderRadius: radius.md, padding: 14, gap: 6 },
});
