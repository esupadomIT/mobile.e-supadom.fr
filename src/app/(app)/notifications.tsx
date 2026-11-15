import { useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card, Notice, SecondaryButton } from '@/components/ui';
import { LIST_POLL_MS } from '@/config';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CHAT_KEY, sortedConversations, useChat } from '@/lib/chat';
import { conversationWhen, formatTime, fullName, messagePreview } from '@/lib/format';
import { useUpcomingSeances } from '@/lib/home';
import { radius, typography as t, useColors } from '@/theme';
import type { Seance } from '@/types';

/**
 * Maquette Figma « Notifications · Clair / Sombre ».
 * Contenu disponible aujourd'hui : les cours du jour (rappel) et les messages non lus.
 */

const hasStarted = (iso: string) => +new Date(iso) <= Date.now();

function relative(iso: string) {
  const min = Math.round((+new Date(iso) - Date.now()) / 60_000);
  if (min <= 0) return 'En cours';
  if (min < 60) return `Dans ${min} minute${min > 1 ? 's' : ''}`;
  const h = Math.floor(min / 60);
  return `Dans ${h} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}`;
}

export default function NotificationsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const chat = useChat(LIST_POLL_MS);
  const seances = useUpcomingSeances(user);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const { refreshing, onRefresh } = useManualRefresh(() => Promise.allSettled([chat.refetch(), seances.refetch()]));

  const unread = sortedConversations(chat.data).filter((conversation) => conversation.unreadCount > 0);
  const today = (seances.data ?? []).filter((s) => new Date(s.start).toDateString() === new Date().toDateString());
  const count = today.length + unread.length;

  const markAllRead = async () => {
    setMarking(true);
    setMarkError(null);
    try {
      const ids = [...new Set(unread.flatMap((conv) => (conv.conversationIds?.length ? conv.conversationIds : [conv.id])))];
      await Promise.all(ids.map((id) => api.markAsRead(id)));
      await qc.invalidateQueries({ queryKey: CHAT_KEY });
      await chat.refetch();
    } catch (e) {
      setMarkError(e instanceof Error ? e.message : 'Impossible de tout marquer comme lu.');
    } finally {
      setMarking(false);
    }
  };

  const loading = chat.isLoading || seances.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <View style={{ gap: 4 }}>
          <Text style={[t.title, { color: c.text }]}>Notifications</Text>
          <Text style={[t.body, { color: c.muted }]}>Vos cours et vos messages en un coup d’œil.</Text>
        </View>

        <Card tone="info">
          <Text style={[t.cardTitle, { color: c.text }]}>Aujourd’hui</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            {loading
              ? 'Chargement…'
              : count === 0
                ? 'Aucune nouvelle notification'
                : `${count} nouvelle${count > 1 ? 's' : ''} notification${count > 1 ? 's' : ''}`}
          </Text>
        </Card>

        {chat.isError ? (
          <View style={{ gap: 12 }}>
            <Notice kind="error">Impossible de récupérer vos notifications.</Notice>
            <SecondaryButton title="Réessayer" onPress={() => void onRefresh()} />
          </View>
        ) : null}

        {today.map((s) => (
          <SeanceNotification key={`s-${s.id}`} seance={s} />
        ))}

        {unread.map((item) => (
          <Card
            key={`m-${item.id}`}
            accessibilityLabel={`${item.unreadCount} messages non lus de ${fullName(item.partner)}`}
            onPress={() => router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(item.partner.id) } })}
          >
            <Text style={[t.cardTitle, { color: c.text }]}>
              {item.unreadCount > 1 ? `${item.unreadCount} nouveaux messages` : 'Nouveau message'}
            </Text>
            <Text style={[t.cardText, { color: c.muted }]} numberOfLines={2}>
              {fullName(item.partner)} · {item.lastMessage ? messagePreview(item.lastMessage) : 'Nouveau message'}
            </Text>
            {item.lastMessage ? (
              <Text style={[t.captionRegular, { color: c.subtle }]}>{conversationWhen(item.lastMessage.createdAt)}</Text>
            ) : null}
          </Card>
        ))}

        {!loading && count === 0 && !chat.isError ? (
          <Card>
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={30} color={c.accent} />
              <Text style={[t.cardTitle, { color: c.text }]}>Vous êtes à jour</Text>
              <Text style={[t.cardText, { color: c.muted, textAlign: 'center' }]}>Les rappels de cours et les nouveaux messages apparaîtront ici.</Text>
            </View>
          </Card>
        ) : null}

        {markError ? <Notice kind="error">{markError}</Notice> : null}
        {unread.length > 0 ? <SecondaryButton title="Tout marquer comme lu" onPress={markAllRead} loading={marking} /> : null}
      </ScrollView>
    </View>
  );
}

function SeanceNotification({ seance }: { seance: Seance }) {
  const c = useColors();
  const live = hasStarted(seance.start);
  return (
    <Card>
      <Text style={[t.cardTitle, { color: c.text }]}>
        {live ? 'Votre cours a commencé' : `Votre cours commence à ${formatTime(seance.start)}`}
      </Text>
      <Text style={[t.cardText, { color: c.muted }]} numberOfLines={1}>
        {seance.subject} · {seance.withWhom}
      </Text>
      <View style={styles.seanceFoot}>
        <Text style={[t.captionRegular, { color: c.subtle, flex: 1 }]}>{relative(seance.start)}</Text>
        {seance.meetLink ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/accueil')}
            hitSlop={8}
            style={[styles.pill, { backgroundColor: c.yellow }]}
          >
            <Ionicons name="videocam-outline" size={14} color={c.onYellow} />
            <Text style={[t.caption, { color: c.onYellow }]}>Voir la séance</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 8, paddingBottom: 32, gap: 12 },
  seanceFoot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
});
