import { router } from 'expo-router';
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YellowButton } from '@/components/ui';
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

  const refreshing = me.isRefetching || seances.isRefetching || chat.isRefetching;
  const onRefresh = () => {
    void me.refetch();
    void seances.refetch();
    void chat.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <ScreenHeader
          subtitle={`${hello()} 👋`}
          title={user?.firstName ?? 'e-Supadom'}
          right={<Image source={require('../../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />}
        >
          <View style={styles.stats}>
            {isStudent ? (
              <Stat label="Solde" value={typeof hours === 'number' ? `${hours.toFixed(1).replace('.', ',')} h` : '—'} />
            ) : (
              <Stat label="Élèves" value={String(studentCount)} />
            )}
            <Stat label="Séances à venir" value={String(upcoming.length)} />
            <Stat label="Non lus" value={String(unread)} highlight={unread > 0} />
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

          {/* Derniers messages */}
          <Section title="Derniers messages" action={{ label: 'Tout voir', onPress: () => router.push('/messages') }}>
            {recent.length === 0 ? (
              <Placeholder text="Pas encore de message." />
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
                      <View style={[styles.dot, { backgroundColor: c.accent }]}>
                        <Text style={{ color: c.onAccent, fontSize: 12, fontWeight: '800' }}>{conv.unreadCount}</Text>
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
    <View style={[styles.stat, { backgroundColor: highlight ? c.accent : 'rgba(255,255,255,0.16)' }]}>
      <Text style={[styles.statValue, { color: highlight ? c.onAccent : '#fff' }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: highlight ? c.onAccent : 'rgba(255,255,255,0.85)' }]}>{label}</Text>
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

function Placeholder({ text }: { text: string }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, alignItems: 'center' }]}>
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
  content: { paddingBottom: 32 },
  logo: { width: 92, height: 44, backgroundColor: '#fff', borderRadius: 12 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, gap: 2 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600' },
  body: { padding: 16, gap: 22 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  card: { borderRadius: radius.lg, padding: 16 },
  next: { gap: 6, borderLeftWidth: 5 },
  tag: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  nextSubject: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  nextActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  carousel: { gap: 12, paddingRight: 8 },
  mini: { width: 200, borderRadius: radius.lg, padding: 14, gap: 4 },
  miniSubject: { fontSize: 16, fontWeight: '700' },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  msgName: { fontSize: 15, fontWeight: '700' },
  dot: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
