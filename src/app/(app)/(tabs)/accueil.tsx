import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BrandHeader, ScreenHeader } from '@/components/ScreenHeader';
import { YellowButton } from '@/components/ui';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { useAuth } from '@/lib/auth';
import { sortedConversations, useChat } from '@/lib/chat';
import { dayLabel, formatTime, fullName, messagePreview } from '@/lib/format';
import { useMe, useUpcomingSeances } from '@/lib/home';
import { radius, shadow, useColors } from '@/theme';
import type { Seance } from '@/types';

const hello = () => {
  const h = new Date().getHours();
  return h < 18 ? 'Bonjour' : 'Bonsoir';
};

export default function HomeScreen() {
  const { user } = useAuth();
  const c = useColors();
  const me = useMe();
  const seances = useUpcomingSeances(user);
  const chat = useChat();
  const isStudent = user?.role === 'STUDENT';

  const unread = (chat.data?.conversations ?? []).reduce((n, conv) => n + conv.unreadCount, 0);
  const recent = sortedConversations(chat.data).slice(0, 3);
  const upcoming = seances.data ?? [];
  const next = upcoming[0];
  const hours = me.data?.totalHours;
  // Prof : élèves suivis (séance en commun ou conversation ouverte)
  const studentCount = new Set([
    ...(chat.data?.students ?? []).filter((st) => st.hasSeance).map((st) => st.id),
    ...(chat.data?.conversations ?? []).filter((conv) => conv.partner.role === 'STUDENT').map((conv) => conv.partner.id),
  ]).size;

  const { refreshing, onRefresh } = useManualRefresh(() =>
    Promise.allSettled([me.refetch(), seances.refetch(), chat.refetch()]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BrandHeader title="Accueil" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <ScreenHeader
          embedded
          subtitle="Ton espace personnel"
          title={`${hello()}, ${user?.firstName ?? 'à toi'}`}
          right={<Pressable accessibilityRole="button" accessibilityLabel="Ouvrir mon profil" onPress={() => router.push('/profil')}><Avatar person={user ?? { id: 0, firstName: '', lastName: '', role: 'STUDENT' }} size={46} /></Pressable>}
        >
          <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}>Une nouvelle journée pour avancer ensemble.</Text>
          <View style={styles.stats}>
            {isStudent ? (
              <Stat label="Solde de cours" value={typeof hours === 'number' ? `${hours.toFixed(1).replace('.', ',')} h` : '—'} highlight />
            ) : (
              <Stat label="Élèves suivis" value={String(studentCount)} highlight />
            )}
            <Stat label="Séances à venir" value={String(upcoming.length)} />
            <Stat label="Messages non lus" value={String(unread)} />
          </View>
        </ScreenHeader>

        <View style={styles.body}>
          {/* Prochaine séance */}
          <Section title="Prochaine séance">
            {seances.isLoading ? (
              <Placeholder text="Chargement…" />
            ) : next ? (
              <NextSeance seance={next} />
            ) : (
              <Placeholder
                text={isStudent ? 'Aucune séance prévue. Réserve un cours avec ton prof depuis le site.' : 'Aucune séance prévue pour le moment.'}
              />
            )}
          </Section>

          {/* Autres séances */}
          {upcoming.length > 1 && (
            <Section title="Ensuite">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
                {upcoming.slice(1, 10).map((s) => (
                  <SeanceCard key={s.id} seance={s} />
                ))}
              </ScrollView>
            </Section>
          )}

          {/* Raccourci : recharge (élève) ou disponibilités (prof) */}
          <Pressable
            onPress={() => router.push(isStudent ? '/recharge' : '/dispos')}
            style={({ pressed }) => [styles.card, shadow, styles.quick, { backgroundColor: pressed ? c.surfaceAlt : c.surface }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: isStudent ? c.yellow : c.accentSoft }]}>
              <Ionicons name={isStudent ? 'card' : 'calendar'} size={22} color={isStudent ? c.onYellow : c.onAccent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.msgName, { color: c.text }]}>{isStudent ? 'Recharger mon compte' : 'Mes disponibilités'}</Text>
              <Text style={{ color: c.muted }} numberOfLines={2}>
                {isStudent ? 'Choisissez une formule et payez en ligne (PayPal ou Alma).' : 'Ajoutez vos créneaux pour les prochaines semaines.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.subtle} />
          </Pressable>

          {/* Derniers messages */}
          <Section title="Derniers messages" action={{ label: 'Tout voir', onPress: () => router.push('/messages') }}>
            {recent.length === 0 ? (
              <Placeholder text="Pas encore de message." icon="chatbubbles-outline" />
            ) : (
              <View style={[styles.card, shadow, { backgroundColor: c.surface, paddingVertical: 4 }]}>
                {recent.map((conv, i) => (
                  <Pressable
                    key={conv.id}
                    onPress={() => router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(conv.partner.id) } })}
                    style={({ pressed }) => [
                      styles.msgRow,
                      { backgroundColor: pressed ? c.surfaceAlt : 'transparent' },
                      i < recent.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
                    ]}
                  >
                    <Avatar person={conv.partner} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.msgName, { color: c.text }]} numberOfLines={1}>
                        {fullName(conv.partner)}
                      </Text>
                      <Text style={{ color: conv.unreadCount ? c.text : c.muted, fontWeight: conv.unreadCount ? '600' : '400' }} numberOfLines={1}>
                        {conv.lastMessage ? messagePreview(conv.lastMessage) : 'Nouvelle conversation'}
                      </Text>
                    </View>
                    {conv.unreadCount > 0 && (
                      <View style={[styles.dot, { backgroundColor: c.notification }]}>
                        <Text style={{ color: c.onNotification, fontSize: 12, fontWeight: '800' }}>{conv.unreadCount}</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: highlight ? c.primary : c.bg, borderColor: highlight ? c.primary : c.border }]}>
      <Text style={[styles.statValue, { color: highlight ? '#fff' : c.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: highlight ? '#EAF3FF' : c.muted }]}>{label}</Text>
    </View>
  );
}

function Section({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={{ color: c.primary, fontWeight: '700' }}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function Placeholder({ text, icon = 'calendar-outline' }: { text: string; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, alignItems: 'center' }]}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}><Ionicons name={icon} size={24} color={c.primary} /></View>
      <Text style={{ color: c.muted, textAlign: 'center', lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

const when = (s: Seance) => `${dayLabel(s.start)} · ${formatTime(s.start)}${s.end ? `–${formatTime(s.end)}` : ''}`;
const startsSoon = (s: Seance) => +new Date(s.start) - Date.now() < 15 * 60_000; // ≤ 15 min ou en cours

function NextSeance({ seance }: { seance: Seance }) {
  const c = useColors();
  return (
    <View style={[styles.card, shadow, styles.next, { backgroundColor: c.surface, borderLeftColor: c.accent }]}>
      <View style={styles.sessionLabel}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary }} /><Text style={{ color: c.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>TON RENDEZ-VOUS</Text><Ionicons name="videocam-outline" size={20} color={c.primary} style={{ marginLeft: 'auto' }} /></View>
      <View style={[styles.tag, { backgroundColor: c.primarySoft }]}>
        <Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }}>{when(seance)}</Text>
      </View>
      <Text style={[styles.nextSubject, { color: c.text }]}>{seance.subject}</Text>
      <Text style={{ color: c.muted }}>avec {seance.withWhom}</Text>
      <View style={styles.nextActions}>
        {seance.meetLink ? (
          <YellowButton
            small
            title={startsSoon(seance) ? 'Rejoindre la séance' : 'Lien Google Meet'}
            onPress={() => Linking.openURL(seance.meetLink!)}
          />
        ) : (
          <Text style={{ color: c.subtle, fontSize: 13 }}>Lien Meet bientôt disponible</Text>
        )}
        {seance.partnerId && (
          <Pressable
            onPress={() => router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(seance.partnerId) } })}
            hitSlop={8}
          >
            <Text style={{ color: c.primary, fontWeight: '700' }}>Écrire</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function SeanceCard({ seance }: { seance: Seance }) {
  const c = useColors();
  return (
    <View style={[styles.mini, shadow, { backgroundColor: c.surface }]}>
      <Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
        {when(seance)}
      </Text>
      <Text style={[styles.miniSubject, { color: c.text }]} numberOfLines={1}>
        {seance.subject}
      </Text>
      <Text style={{ color: c.muted, fontSize: 13 }} numberOfLines={1}>
        {seance.withWhom}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 32 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: radius.md, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 10, gap: 7 },
  statValue: { fontSize: 25, fontWeight: '800', letterSpacing: -0.8 },
  statLabel: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
  body: { padding: 20, gap: 26 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  card: { borderRadius: radius.lg, padding: 20, gap: 8 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  sessionLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  next: { gap: 8, borderLeftWidth: 4 },
  tag: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  nextSubject: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6, marginTop: 6 },
  nextActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  carousel: { gap: 12, paddingRight: 8 },
  mini: { width: 200, borderRadius: radius.lg, padding: 14, gap: 4 },
  miniSubject: { fontSize: 16, fontWeight: '700' },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  msgName: { fontSize: 15, fontWeight: '700' },
  dot: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
