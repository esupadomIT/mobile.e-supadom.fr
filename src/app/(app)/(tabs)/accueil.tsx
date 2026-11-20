import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ParentHome } from '@/components/ParentHome';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { useAuth } from '@/lib/auth';
import { sortedConversations, useChat } from '@/lib/chat';
import { conversationWhen, dayLabel, formatTime, fullName, messagePreview } from '@/lib/format';
import { useMe, useUpcomingSeances } from '@/lib/home';
import { fonts, radius, shadow, typography as t, useColors } from '@/theme';
import type { Seance } from '@/types';

/** Maquette Figma « 🏠 Home - dashboard » : 11 Accueil Élève / 12 Accueil Professeur (clair et sombre). */

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const openChat = (partnerId: number) =>
  router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(partnerId) } });

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
  const todayCount = upcoming.filter((s) => new Date(s.start).toDateString() === new Date().toDateString()).length;
  const hours = me.data?.totalHours;
  // Prof : élèves suivis (séance en commun ou conversation ouverte)
  const studentCount = new Set([
    ...(chat.data?.students ?? []).filter((st) => st.hasSeance).map((st) => st.id),
    ...(chat.data?.conversations ?? []).filter((conv) => conv.partner.role === 'STUDENT').map((conv) => conv.partner.id),
  ]).size;

  const { refreshing, onRefresh } = useManualRefresh(() =>
    Promise.allSettled([me.refetch(), seances.refetch(), chat.refetch()]),
  );

  // Parent / tuteur : accueil dédié (enfants suivis), après les hooks
  if (user?.role === 'PARENT') return <ParentHome />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader showBack={false} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {/* Salutation */}
        <View style={[styles.hello, { backgroundColor: c.surface }]}>
          <Text style={[t.title, { color: c.text }]} numberOfLines={1}>
            Bonjour {user?.firstName ?? ''}
          </Text>
          <Text style={[t.body, { color: c.muted }]}>
            {isStudent ? 'Une nouvelle étape vers vos objectifs.' : 'Votre journée de cours, en un coup d’œil.'}
          </Text>
        </View>

        <View style={styles.body}>
          {/* Indicateurs */}
          <View style={[styles.highlight, { backgroundColor: c.accentSoft }]}>
            <View style={[styles.highlightIcon, { backgroundColor: c.surface }]}>
              <Ionicons name={isStudent ? 'time-outline' : 'people-outline'} size={20} color={c.primary} />
            </View>
            <View style={{ gap: 2 }}>
              <Text style={[t.captionRegular, { color: c.onAccent }]}>
                {isStudent ? 'Votre solde d’heures' : 'Élèves suivis'}
              </Text>
              <View style={styles.highlightRow}>
                <Text style={[styles.highlightValue, { color: c.text }]}>
                  {isStudent ? formatHours(hours) : String(studentCount)}
                </Text>
                <Text style={[t.captionRegular, { color: c.onAccent }]}>{isStudent ? 'restantes' : 'au total'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.stats}>
            <Stat
              icon="calendar-outline"
              value={isStudent ? upcoming.length : todayCount}
              label={isStudent ? 'séances à venir' : 'cours aujourd’hui'}
            />
            <Stat icon="chatbubble-outline" value={unread} label="messages non lus" />
          </View>

          {/* Prochaine séance */}
          {seances.isLoading ? (
            <Empty icon="calendar-outline" text="Chargement de vos séances…" />
          ) : next ? (
            <NextSeance seance={next} isStudent={isStudent} />
          ) : (
            <Empty
              icon="calendar-outline"
              text={isStudent ? 'Aucune séance prévue. Rechargez votre compte ou trouvez un prof pour réserver.' : 'Aucune séance prévue pour le moment.'}
            />
          )}

          {/* Raccourci : recharge (élève) ou disponibilités (prof) */}
          <ActionRow
            icon={isStudent ? 'add' : 'calendar-clear-outline'}
            title={isStudent ? 'Recharger mon compte' : 'Mes disponibilités'}
            text={isStudent ? 'Préparer les prochaines séances' : 'Gérer mes créneaux de cours'}
            onPress={() => router.push(isStudent ? '/recharge' : '/dispos')}
          />

          {/* Séances suivantes */}
          {upcoming.length > 1 && (
            <Section title="Les séances suivantes" action={{ label: 'Planning', onPress: () => router.push('/dispos') }}>
              <Carousel seances={upcoming.slice(1, 10)} />
            </Section>
          )}

          {/* Derniers messages */}
          <Section title="Derniers messages" action={{ label: 'Tout voir', onPress: () => router.push('/messages') }}>
            {recent.length === 0 ? (
              <Empty icon="chatbubbles-outline" text="Pas encore de message." />
            ) : (
              <View style={{ gap: 10 }}>
                {recent.map((conv) => (
                  <Pressable
                    key={conv.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Conversation avec ${fullName(conv.partner)}${conv.unreadCount ? `, ${conv.unreadCount} non lus` : ''}`}
                    onPress={() => openChat(conv.partner.id)}
                    style={({ pressed }) => [
                      styles.card,
                      styles.msg,
                      { backgroundColor: pressed ? c.surfaceAlt : c.surface, borderColor: c.border },
                    ]}
                  >
                    <View style={styles.msgHead}>
                      <Text style={[t.cardTitle, { color: c.text, flex: 1 }]} numberOfLines={1}>
                        {fullName(conv.partner)}
                      </Text>
                      {conv.lastMessage ? (
                        <Text style={[t.captionRegular, { color: c.muted }]}>{conversationWhen(conv.lastMessage.createdAt)}</Text>
                      ) : null}
                    </View>
                    <Text style={[t.cardText, { color: c.muted }]} numberOfLines={2}>
                      {conv.lastMessage ? messagePreview(conv.lastMessage) : 'Nouvelle conversation'}
                    </Text>
                    {conv.unreadCount > 0 ? (
                      <View style={styles.unread}>
                        <View style={[styles.unreadDot, { backgroundColor: c.primary }]} />
                        <Text style={[t.caption, { color: c.primary }]}>
                          {conv.unreadCount > 1 ? `${conv.unreadCount} non lus` : 'Non lu'}
                        </Text>
                      </View>
                    ) : null}
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

function formatHours(h: number | null | undefined) {
  if (typeof h !== 'number') return '—';
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return min ? `${whole}h${String(min).padStart(2, '0')}` : `${whole}h`;
}

function durationLabel(s: Seance) {
  if (!s.end) return null;
  const min = Math.round((+new Date(s.end) - +new Date(s.start)) / 60_000);
  if (min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`;
}

const isLive = (s: Seance) => +new Date(s.start) <= Date.now();
const startsSoon = (s: Seance) => +new Date(s.start) - Date.now() < 15 * 60_000; // ≤ 15 min ou en cours

function Stat({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  const c = useColors();
  return (
    <View style={[styles.card, styles.stat, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Ionicons name={icon} size={18} color={c.primary} />
      <View>
        <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
        <Text style={[t.captionRegular, { color: c.muted }]}>{label}</Text>
      </View>
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
          <Pressable accessibilityRole="link" onPress={action.onPress} hitSlop={10} style={styles.sectionAction}>
            <Text style={[t.caption, { color: c.link }]}>{action.label}</Text>
            <Ionicons name="chevron-forward" size={13} color={c.link} />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function Empty({ text, icon }: { text: string; icon: IconName }) {
  const c = useColors();
  return (
    <View style={[styles.card, styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
        <Ionicons name={icon} size={22} color={c.primary} />
      </View>
      <Text style={[t.cardText, { color: c.muted, textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

function ActionRow({ icon, title, text, onPress }: { icon: IconName; title: string; text: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.action,
        { backgroundColor: pressed ? c.primarySoft : c.surfaceAlt, borderColor: c.border },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Ionicons name={icon} size={18} color={c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.cardTitle, { color: c.link, fontSize: 14 }]}>{title}</Text>
        <Text style={[t.captionRegular, { color: c.muted }]}>{text}</Text>
      </View>
      <Ionicons name="arrow-forward" size={18} color={c.link} />
    </Pressable>
  );
}

function NextSeance({ seance, isStudent }: { seance: Seance; isStudent: boolean }) {
  const c = useColors();
  const duration = durationLabel(seance);
  const live = isLive(seance);
  return (
    <View style={[styles.card, shadow, styles.next, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.nextHead}>
        <Text style={[styles.overline, { color: c.primary }]}>PROCHAINE SÉANCE</Text>
        <View style={[styles.badge, { backgroundColor: live ? c.yellow : c.accentSoft }]}>
          <Text style={[t.caption, { color: live ? c.onYellow : c.onAccent }]}>
            {live ? 'En cours' : seance.status === 'ACTIVE' ? 'Confirmée' : 'À venir'}
          </Text>
        </View>
      </View>

      <View>
        <Text style={[t.cardTitle, { color: c.text }]}>
          {dayLabel(seance.start)} à {formatTime(seance.start)}
        </Text>
        {duration ? <Text style={[t.captionRegular, { color: c.muted }]}>Durée : {duration}</Text> : null}
      </View>

      <View style={[styles.rule, { backgroundColor: c.border }]} />

      <View>
        <Text style={[styles.subject, { color: c.text }]} numberOfLines={2}>
          {seance.subject}
        </Text>
        {seance.level ? <Text style={[t.captionRegular, { color: c.muted }]}>{seance.level}</Text> : null}
      </View>

      <View style={styles.person}>
        <View style={{ flex: 1 }}>
          <Text style={[t.cardTitle, { color: c.text, fontSize: 13 }]} numberOfLines={1}>
            {seance.withWhom}
          </Text>
          <Text style={[t.captionRegular, { color: c.muted }]}>{isStudent ? 'Votre professeur' : 'Votre élève'}</Text>
        </View>
        {seance.partnerId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Écrire à ${seance.withWhom}`}
            onPress={() => openChat(seance.partnerId!)}
            hitSlop={6}
            style={({ pressed }) => [styles.round, { backgroundColor: pressed ? c.primarySoft : c.surfaceAlt }]}
          >
            <Ionicons name="chatbubble-outline" size={17} color={c.primary} />
          </Pressable>
        ) : null}
      </View>

      {seance.meetLink ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => Linking.openURL(seance.meetLink!)}
          style={({ pressed }) => [styles.meet, { backgroundColor: pressed ? c.yellowPressed : c.yellow }]}
        >
          <Ionicons name="videocam-outline" size={18} color={c.onYellow} />
          <Text style={[t.button, { color: c.onYellow }]}>
            {startsSoon(seance) ? 'Rejoindre la séance Meet' : 'Lien Google Meet'}
          </Text>
        </Pressable>
      ) : (
        <Text style={[t.captionRegular, { color: c.subtle, textAlign: 'center' }]}>Lien Meet bientôt disponible</Text>
      )}
    </View>
  );
}

const CARD_W = 230;

/** Carrousel des séances suivantes, avec indicateur de position et « Faire défiler ». */
function Carousel({ seances }: { seances: Seance[] }) {
  const c = useColors();
  const [index, setIndex] = useState(0);
  return (
    <View style={{ gap: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
        snapToInterval={CARD_W + 12}
        decelerationRate="fast"
        scrollEventThrottle={32}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / (CARD_W + 12)))}
      >
        {seances.map((s) => (
          <SeanceCard key={s.id} seance={s} />
        ))}
      </ScrollView>
      {seances.length > 1 ? (
        <View style={styles.dotsRow}>
          <View style={styles.dots}>
            {seances.map((s, i) => (
              <View key={s.id} style={[styles.dotPage, { backgroundColor: i === index ? c.primary : c.border, width: i === index ? 18 : 6 }]} />
            ))}
          </View>
          <View style={styles.sectionAction}>
            <Text style={[t.captionRegular, { color: c.link }]}>Faire défiler</Text>
            <Ionicons name="arrow-forward" size={14} color={c.link} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SeanceCard({ seance }: { seance: Seance }) {
  const c = useColors();
  const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(seance.start));
  const duration = durationLabel(seance);
  const meta = [seance.level, seance.status === 'ACTIVE' ? 'Confirmé' : null].filter(Boolean).join(' · ');
  return (
    <View style={[styles.card, styles.mini, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.miniDate, { color: c.text }]}>{date}</Text>
      <Text style={[t.caption, { color: c.primary }]}>
        {formatTime(seance.start)}
        {seance.end ? `–${formatTime(seance.end)}` : ''}
      </Text>
      <View style={[styles.rule, { backgroundColor: c.border, marginVertical: 10 }]} />
      <Text style={[t.cardTitle, { color: c.text, fontSize: 14 }]} numberOfLines={1}>
        {seance.subject}
      </Text>
      <Text style={[t.captionRegular, { color: c.muted }]} numberOfLines={1}>
        {seance.withWhom}
      </Text>
      {meta ? (
        <Text style={[t.captionRegular, { color: c.onAccent, marginTop: 6 }]} numberOfLines={1}>
          {meta}
        </Text>
      ) : duration ? (
        <Text style={[t.captionRegular, { color: c.muted, marginTop: 6 }]}>Durée : {duration}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  hello: { paddingHorizontal: 20, paddingBottom: 20, gap: 2 },
  body: { padding: 16, gap: 16 },
  card: { borderRadius: radius.md, borderWidth: 1, padding: 16 },

  highlight: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.md, padding: 16 },
  highlightIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  highlightRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  highlightValue: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },

  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 14 },
  statValue: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22 },

  next: { gap: 12 },
  nextHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overline: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  rule: { height: StyleSheet.hairlineWidth * 2 },
  subject: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  round: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  meet: { minHeight: 50, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },

  action: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  section: { gap: 12, marginTop: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },

  carousel: { gap: 12, paddingRight: 8 },
  mini: { width: CARD_W, gap: 2 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dotPage: { height: 4, borderRadius: 2 },
  miniDate: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },

  msg: { gap: 4 },
  msgHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unread: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  unreadDot: { width: 6, height: 6, borderRadius: 3 },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 22 },
  emptyIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
