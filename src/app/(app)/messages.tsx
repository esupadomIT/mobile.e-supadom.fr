import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card, PrimaryButton } from '@/components/ui';
import { LIST_POLL_MS } from '@/config';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { useAuth } from '@/lib/auth';
import { sortedConversations, startableContacts, useChat } from '@/lib/chat';
import { conversationWhen, fullName, messagePreview, roleLabel } from '@/lib/format';
import { fonts, typography as t, useColors } from '@/theme';
import type { Contact, Conversation } from '@/types';

/** Maquette Figma « 📨 Parcours Messages » → écran « Messages · Clair / Sombre » (53:24382). */

const openChat = (partnerId: number) =>
  router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(partnerId) } });

type Filter = 'unread' | 'all';

export default function ConversationsScreen() {
  const { user } = useAuth();
  const c = useColors();
  const { data, isLoading, isError, refetch } = useChat(LIST_POLL_MS);
  const { refreshing, onRefresh } = useManualRefresh(() => refetch());
  const [filter, setFilter] = useState<Filter>('all');

  const all = useMemo(() => sortedConversations(data), [data]);
  const unreadConversations = useMemo(() => all.filter((conv) => conv.unreadCount > 0), [all]);
  const conversations = filter === 'unread' ? unreadConversations : all;
  const contacts = useMemo(() => startableContacts(data, user), [data, user]);
  const totalUnread = all.reduce((n, conv) => n + conv.unreadCount, 0);
  const isStudent = user?.role === 'STUDENT';
  // « Ouvrir la conversation » : la plus récente non lue, sinon la plus récente.
  const next = unreadConversations[0] ?? all[0];

  const header = (
    <View style={styles.headerBlock}>
      <Text style={[t.title, { color: c.text }]}>Messages</Text>
      <Text style={[t.body, { color: c.muted }]}>
        {isStudent ? 'Vos échanges avec l’équipe pédagogique.' : 'Vos échanges avec vos élèves et leurs parents.'}
      </Text>

      <Card tone="info">
        <Text style={[t.cardTitle, { color: c.text }]}>
          {filter === 'unread' ? 'Conversations non lues' : 'Toutes les conversations'}
        </Text>
        <View style={styles.filters}>
          <FilterLink label={`Non lus · ${totalUnread}`} active={filter === 'unread'} onPress={() => setFilter('unread')} />
          <Text style={[t.cardText, { color: c.muted }]}>|</Text>
          <FilterLink label="Tous les messages" active={filter === 'all'} onPress={() => setFilter('all')} />
        </View>
      </Card>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {next ? <PrimaryButton title="Ouvrir la conversation" onPress={() => openChat(next.partner.id)} /> : null}
      {contacts.length > 0 ? (
        <View style={styles.contacts}>
          <Text style={[t.caption, { color: c.muted }]}>
            {isStudent ? 'ÉCRIRE À UN DE VOS PROFESSEURS' : 'ÉCRIRE À UN DE VOS ÉLÈVES'}
          </Text>
          {contacts.map((ct) => (
            <ContactCard key={ct.id} contact={ct} />
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      {isLoading ? (
        <ActivityIndicator style={styles.center} color={c.primary} />
      ) : isError ? (
        <View style={[styles.list, { flex: 1 }]}>
          <Card onPress={() => refetch()} accessibilityLabel="Réessayer">
            <Text style={[t.cardTitle, { color: c.text }]}>Connexion impossible</Text>
            <Text style={[t.cardText, { color: c.muted }]}>Touchez ici pour réessayer.</Text>
          </Card>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(conv) => String(conv.id)}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Gap}
          ListEmptyComponent={
            <Card>
              <Text style={[t.cardTitle, { color: c.text }]}>
                {filter === 'unread' ? 'Aucun message non lu' : 'Aucune conversation pour l’instant'}
              </Text>
              <Text style={[t.cardText, { color: c.muted }]}>
                {filter === 'unread'
                  ? 'Vous êtes à jour.'
                  : `Vos échanges avec ${isStudent ? 'vos professeurs' : 'vos élèves'} apparaîtront ici.`}
              </Text>
            </Card>
          }
          renderItem={({ item }) => <ConversationCard conversation={item} myId={user?.id} />}
        />
      )}
    </View>
  );
}

function Gap() {
  return <View style={{ height: 16 }} />;
}

function FilterLink({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} hitSlop={8}>
      <Text style={[t.cardText, { color: active ? c.link : c.muted }, active && styles.active]}>{label}</Text>
    </Pressable>
  );
}

/** Carte « Dr. Marc Lambert · 16:42 » : nom · heure, aperçu, mention NOUVEAU si non lu. */
function ConversationCard({ conversation, myId }: { conversation: Conversation; myId?: number }) {
  const c = useColors();
  const { partner, lastMessage, unreadCount } = conversation;
  const unread = unreadCount > 0;
  const preview = lastMessage
    ? `${lastMessage.senderId === myId ? 'Vous : ' : ''}${messagePreview(lastMessage)}`
    : 'Nouvelle conversation';
  const title = lastMessage ? `${fullName(partner)} · ${conversationWhen(lastMessage.createdAt)}` : fullName(partner);

  return (
    <Card onPress={() => openChat(partner.id)} accessibilityLabel={`Conversation avec ${fullName(partner)}${unread ? `, ${unreadCount} non lus` : ''}`}>
      <Text style={[t.cardTitle, { color: c.text }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[t.cardText, { color: c.muted }]} numberOfLines={1}>
        {preview}
      </Text>
      {unread ? (
        <Text style={[t.caption, { color: c.link }]}>
          NOUVEAU · {unreadCount > 1 ? `${unreadCount} messages` : roleLabel(partner.role)}
        </Text>
      ) : null}
    </Card>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  const c = useColors();
  return (
    <Card onPress={() => openChat(contact.id)} accessibilityLabel={`Écrire à ${fullName(contact)}`}>
      <Text style={[t.cardTitle, { color: c.text }]} numberOfLines={1}>
        {fullName(contact)}
      </Text>
      <Text style={[t.cardText, { color: c.muted }]}>{roleLabel(contact.role)} · Démarrer une conversation</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 24, paddingBottom: 40 },
  headerBlock: { gap: 16, marginBottom: 16 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  active: { fontFamily: fonts.semibold },
  footer: { gap: 16, marginTop: 16 },
  contacts: { gap: 12, marginTop: 8 },
});
