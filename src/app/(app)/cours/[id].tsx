import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { AccountScreen } from '@/components/AccountScreen';
import { Card, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatIsoDay, hhmm, isoDay } from '@/lib/tz';
import { typography as t, useColors } from '@/theme';
import type { Seance } from '@/types';

/** Maquettes Planning : « Le cours d’aujourd’hui » (élève et prof). */

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const hasEnded = (iso: string) => Date.parse(iso) < Date.now();

function duration(s: Seance) {
  if (!s.end) return null;
  const min = Math.round((Date.parse(s.end) - Date.parse(s.start)) / 60_000);
  const h = Math.floor(min / 60);
  return h ? `${h}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}` : `${min} min`;
}

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const c = useColors();
  const isInstructor = user?.role === 'INSTRUCTOR';
  const [failed, setFailed] = useState(false);
  const [range] = useState(() => ({ from: new Date(Date.now() - 31 * 86400000), to: new Date(Date.now() + 62 * 86400000) }));
  const query = useQuery({
    queryKey: ['seances', 'detail', user?.id, id],
    enabled: !!user,
    queryFn: () => api.seances(user!, range.from, range.to),
  });
  const session = query.data?.find((s) => String(s.id) === id);

  const open = async () => {
    try {
      if (session?.meetLink) await Linking.openURL(session.meetLink);
    } catch {
      setFailed(true);
    }
  };

  const day = session ? isoDay(new Date(session.start)) : null;
  const isToday = day === isoDay();
  const ended = !!session?.end && hasEnded(session.end);
  const firstName = session?.withWhom.split(' ')[0] ?? '';

  return (
    <AccountScreen
      title={isToday ? 'Le cours d’aujourd’hui' : 'Mon cours'}
      subtitle={session ? [session.subject, session.level].filter(Boolean).join(' · ') : 'Les informations utiles pour votre séance.'}
    >
      {query.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : query.error ? (
        <>
          <Notice kind="error">Le cours ne peut pas être chargé pour le moment.</Notice>
          <SecondaryButton title="Réessayer" onPress={() => void query.refetch()} />
        </>
      ) : !session ? (
        <Card>
          <Text style={[t.cardTitle, { color: c.text }]}>Ce cours n’est pas disponible</Text>
          <Text style={[t.cardText, { color: c.muted }]}>Il a pu être déplacé ou ne fait plus partie de votre planning récent.</Text>
        </Card>
      ) : (
        <>
          <Card tone="info">
            <Text style={[t.cardTitle, { color: c.text }]}>
              {isToday ? 'Aujourd’hui' : formatIsoDay(day!).replace(/^./, (ch) => ch.toUpperCase())} à {hhmm(new Date(session.start))}
            </Text>
            <Text style={[t.cardText, { color: c.muted }]}>
              {session.status === 'ACTIVE' ? 'Séance confirmée' : session.status === 'COMPLETED' ? 'Séance terminée' : 'Séance planifiée'}
              {duration(session) ? ` · ${duration(session)}` : ''}
            </Text>
            <Row icon="calendar-outline" text={`${formatIsoDay(day!).split(' ').slice(1).join(' ')} · ${hhmm(new Date(session.start))}${session.end ? ` – ${hhmm(new Date(session.end))}` : ''}`} />
            <Row icon="videocam-outline" text="Visioconférence Google Meet" />
            <Row icon="chatbubble-outline" text={`${session.withWhom} · ${isInstructor ? 'votre élève' : 'votre professeur'}`} />
          </Card>

          {ended && (isInstructor || session.effectuee != null || session.recordLink) ? (
            <Card>
              <Text style={[t.cardTitle, { color: c.text }]}>Séance terminée</Text>
              <Text style={[t.cardText, { color: session.effectuee === false ? c.danger : c.muted }]}>
                {session.effectuee === true
                  ? 'Séance effectuée : la présence a été vérifiée dans Google Meet.'
                  : session.effectuee === false
                    ? session.profSeul
                      ? 'Séance non effectuée : le professeur était seul dans la visio.'
                      : 'Séance non effectuée selon la vérification Google Meet.'
                    : 'Vérification de la présence en cours (automatique, à partir de Google Meet).'}
              </Text>
              {session.recordLink ? (
                <SecondaryButton title="Voir l’enregistrement" onPress={() => void Linking.openURL(session.recordLink!).catch(() => setFailed(true))} />
              ) : null}
            </Card>
          ) : null}

          <Card>
            <Text style={[t.cardTitle, { color: c.text }]}>À préparer</Text>
            <Text style={[t.cardText, { color: c.muted }]}>Retrouvez les consignes et les documents partagés dans votre conversation.</Text>
          </Card>

          {failed ? <Notice kind="error">Le lien du cours n’a pas pu être ouvert. Merci de réessayer.</Notice> : null}
          {session.meetLink && !ended ? (
            <PrimaryButton title="Rejoindre la séance Meet" onPress={() => void open()} />
          ) : !ended ? (
            <Notice kind="success">Le lien de visioconférence sera affiché ici dès qu’il sera disponible.</Notice>
          ) : null}
          {session.partnerId ? (
            <SecondaryButton
              title={firstName ? `Écrire à ${firstName}` : isInstructor ? 'Écrire à l’élève' : 'Écrire au professeur'}
              onPress={() => router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(session.partnerId) } })}
            />
          ) : null}
          <Text style={[t.captionRegular, { color: c.muted }]}>
            {isInstructor ? 'Après la séance, la présence est vérifiée automatiquement dans Google Meet.' : 'Un empêchement ? Contactez votre professeur pour convenir d’un autre créneau.'}
          </Text>
        </>
      )}
      <SecondaryButton title="Retour au planning" onPress={() => router.navigate('/planning')} />
    </AccountScreen>
  );
}

function Row({ icon, text }: { icon: IconName; text: string }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={17} color={c.link} />
      <Text style={[t.cardText, { color: c.muted, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
