import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { useAuth } from '@/lib/auth';
import { useUpcomingSeances } from '@/lib/home';
import { addDaysIso, formatIsoDay, hhmm, isoDay, weekdayOfIso } from '@/lib/tz';
import { fonts, radius, typography as t, useColors } from '@/theme';
import type { Seance } from '@/types';

/**
 * Maquettes « 📆 Planning Élève & Parent » et « 📆 Planning Professeur » : « Mon planning ».
 * Semaine en cours (heure de Paris), séances du jour choisi, puis les suivantes.
 */

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const mondayOf = (iso: string) => addDaysIso(iso, -((weekdayOfIso(iso) + 6) % 7));
const dayNum = (iso: string) => Number(iso.slice(8, 10));

function dayTitle(iso: string, today: string) {
  if (iso === today) return `Aujourd’hui · ${formatIsoDay(iso).split(' ').slice(1).join(' ')}`;
  if (iso === addDaysIso(today, 1)) return 'Demain';
  return formatIsoDay(iso).replace(/^./, (ch) => ch.toUpperCase());
}

const timeRange = (s: Seance) => `${hhmm(new Date(s.start))}${s.end ? ` – ${hhmm(new Date(s.end))}` : ''}`;
const openCourse = (s: Seance) => router.push({ pathname: '/cours/[id]', params: { id: String(s.id) } });

export default function PlanningScreen() {
  const c = useColors();
  const { user } = useAuth();
  const isInstructor = user?.role === 'INSTRUCTOR';
  const query = useUpcomingSeances(user);
  const { refreshing, onRefresh } = useManualRefresh(() => query.refetch());

  const today = isoDay();
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  const [selected, setSelected] = useState(today);

  const sessions = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    [query.data],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, Seance[]>();
    for (const s of sessions) {
      const d = isoDay(new Date(s.start));
      map.set(d, [...(map.get(d) ?? []), s]);
    }
    return map;
  }, [sessions]);

  const week = Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i));
  const daySessions = byDay.get(selected) ?? [];
  const later = sessions.filter((s) => isoDay(new Date(s.start)) > selected).slice(0, 8);
  const [y, m] = weekStart.split('-').map(Number);

  const pickWeek = (delta: number) => {
    const next = addDaysIso(weekStart, delta * 7);
    setWeekStart(next);
    setSelected(next < today ? today : next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader showBack={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={[t.title, { color: c.text }]}>
            Mon planning
          </Text>
          <Text style={[t.body, { color: c.muted }]}>
            {isInstructor ? 'Vos séances et disponibilités, au même endroit.' : 'Vos prochaines étapes vers la réussite.'}
          </Text>
        </View>

        {/* Semaine */}
        <Card tone="info">
          <View style={styles.weekHead}>
            <Text style={[t.cardTitle, { color: c.text, flex: 1 }]}>
              {MONTHS[m - 1]} · semaine du {dayNum(weekStart)}
              {y !== Number(today.slice(0, 4)) ? ` ${y}` : ''}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Semaine précédente"
              disabled={weekStart <= mondayOf(today)}
              onPress={() => pickWeek(-1)}
              hitSlop={8}
              style={{ opacity: weekStart <= mondayOf(today) ? 0.3 : 1 }}
            >
              <Ionicons name="chevron-back" size={20} color={c.link} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Semaine suivante"
              disabled={weekStart >= addDaysIso(mondayOf(today), 28)}
              onPress={() => pickWeek(1)}
              hitSlop={8}
              style={{ opacity: weekStart >= addDaysIso(mondayOf(today), 28) ? 0.3 : 1 }}
            >
              <Ionicons name="chevron-forward" size={20} color={c.link} />
            </Pressable>
          </View>
          <View style={styles.days}>
            {week.map((d) => {
              const on = d === selected;
              const has = byDay.has(d);
              const past = d < today;
              return (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: past }}
                  accessibilityLabel={`${formatIsoDay(d)}${has ? ', séances prévues' : ''}`}
                  disabled={past}
                  onPress={() => setSelected(d)}
                  style={[styles.day, { backgroundColor: on ? c.primary : 'transparent', opacity: past ? 0.4 : 1 }]}
                >
                  <Text style={[styles.dayName, { color: on ? c.onPrimary : c.link }]}>{DAYS[weekdayOfIso(d)]}</Text>
                  <Text style={[styles.dayNum, { color: on ? c.onPrimary : c.link }]}>{dayNum(d)}</Text>
                  <View style={[styles.dayDot, { backgroundColor: has ? (on ? c.onPrimary : c.primary) : 'transparent' }]} />
                </Pressable>
              );
            })}
          </View>
        </Card>

        {query.isLoading ? <ActivityIndicator accessibilityLabel="Chargement du planning" color={c.primary} /> : null}
        {query.error ? (
          <View style={{ gap: 12 }}>
            <Notice kind="error">Votre planning est momentanément indisponible.</Notice>
            <SecondaryButton title="Réessayer" onPress={() => void query.refetch()} />
          </View>
        ) : null}

        {!query.isLoading && !query.error ? (
          <View style={{ gap: 12 }}>
            <Text accessibilityRole="header" style={[t.cardTitle, { color: c.text }]}>
              {dayTitle(selected, today)}
            </Text>
            {daySessions.length === 0 ? (
              <Card>
                <Text style={[t.cardText, { color: c.muted }]}>Aucune séance ce jour-là.</Text>
              </Card>
            ) : (
              daySessions.map((s, i) => (i === 0 ? <MainSession key={s.id} s={s} /> : <CompactSession key={s.id} s={s} title={timeRange(s)} />))
            )}

            {later.length ? (
              <>
                <Text accessibilityRole="header" style={[t.cardTitle, { color: c.text, marginTop: 8 }]}>
                  À venir
                </Text>
                {later.map((s) => (
                  <CompactSession key={s.id} s={s} title={`${dayTitle(isoDay(new Date(s.start)), today).replace(/^Aujourd’hui · .*/, 'Aujourd’hui')} · ${timeRange(s)}`} />
                ))}
              </>
            ) : null}

            {!sessions.length ? (
              <Card>
                <Ionicons name="calendar-outline" size={28} color={c.link} />
                <Text style={[t.cardTitle, { color: c.text }]}>Votre planning est libre</Text>
                <Text style={[t.cardText, { color: c.muted }]}>Vos prochains cours apparaîtront ici dès leur réservation.</Text>
              </Card>
            ) : null}
          </View>
        ) : null}

        {!isInstructor ? <PrimaryButton title="Réserver un cours" onPress={() => router.push('/reserver')} /> : null}
        <SecondaryButton title="Gérer mes disponibilités" onPress={() => router.push('/dispos')} />
      </ScrollView>
    </View>
  );
}

function MainSession({ s }: { s: Seance }) {
  const c = useColors();
  return (
    <Card>
      <Text style={[t.cardTitle, { color: c.text }]}>
        {timeRange(s)} · {s.subject}
      </Text>
      <Text style={[t.cardText, { color: c.muted }]}>{[s.withWhom, s.level].filter(Boolean).join(' · ')}</Text>
      <View style={styles.meta}>
        <Ionicons name="videocam-outline" size={16} color={c.link} />
        <Text style={[t.captionRegular, { color: c.muted }]}>
          En ligne{s.status === 'ACTIVE' ? ' · séance confirmée' : s.status === 'COMPLETED' ? ' · séance terminée' : ''}
        </Text>
      </View>
      <PrimaryButton title="Voir le cours" onPress={() => openCourse(s)} />
    </Card>
  );
}

function CompactSession({ s, title }: { s: Seance; title: string }) {
  const c = useColors();
  return (
    <Card onPress={() => openCourse(s)} accessibilityLabel={`${title}, ${s.subject}, ${s.withWhom}`}>
      <Text style={[t.cardTitle, { color: c.text }]}>{title}</Text>
      <Text style={[t.cardText, { color: c.muted }]}>
        {s.subject} · {s.withWhom}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 8, gap: 16, paddingBottom: 36, width: '100%', maxWidth: 760, alignSelf: 'center' },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  day: { alignItems: 'center', borderRadius: radius.sm, paddingVertical: 6, width: 42, gap: 1 },
  dayName: { fontFamily: fonts.semibold, fontSize: 11 },
  dayNum: { fontFamily: fonts.bold, fontSize: 15 },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
