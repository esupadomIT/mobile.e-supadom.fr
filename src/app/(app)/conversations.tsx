import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { LIST_POLL_MS } from '@/config';
import { useAuth } from '@/lib/auth';
import { sortedConversations, startableContacts, useChat } from '@/lib/chat';
import { formatWhen, fullName, messagePreview, roleLabel } from '@/lib/format';
import { radius, useColors } from '@/theme';
import type { Contact, Conversation } from '@/types';

const openChat = (partnerId: number) =>
  router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(partnerId) } });

const matches = (p: { firstName: string; lastName: string }, q: string) =>
  !q || fullName(p).toLowerCase().includes(q.trim().toLowerCase());

export default function ConversationsScreen() {
  const { user, signOut } = useAuth();
  const c = useColors();
  const { data, isLoading, isError, refetch, isRefetching } = useChat(LIST_POLL_MS);
  const [query, setQuery] = useState('');

  const conversations = useMemo(
    () => sortedConversations(data).filter((conv) => matches(conv.partner, query)),
    [data, query],
  );
  const contacts = useMemo(() => startableContacts(data, user).filter((ct) => matches(ct, query)), [data, user, query]);
  const isStudent = user?.role === 'STUDENT';
  const totalUnread = conversations.reduce((n, conv) => n + conv.unreadCount, 0);

  const confirmSignOut = () =>
    Alert.alert('Se déconnecter ?', 'Tu ne recevras plus les notifications sur ce téléphone.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => void signOut() },
    ]);

  const header = (
    <View style={styles.headerBlock}>
      <View style={[styles.search, { backgroundColor: c.surfaceAlt }]}>
        <Text style={{ color: c.subtle, fontSize: 16 }}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={isStudent ? 'Rechercher un prof' : 'Rechercher un élève'}
          placeholderTextColor={c.subtle}
          style={[styles.searchInput, { color: c.text }]}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {contacts.length > 0 && (
        <View style={styles.contactsBlock}>
          <Text style={[styles.sectionTitle, { color: c.muted }]}>
            {isStudent ? 'Écrire à un de tes profs' : 'Écrire à un de tes élèves'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contacts}>
            {contacts.map((ct) => (
              <ContactChip key={ct.id} contact={ct} />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.listTitleRow}>
        <Text style={[styles.sectionTitle, { color: c.muted }]}>Conversations</Text>
        {totalUnread > 0 && (
          <View style={[styles.badge, { backgroundColor: c.primary }]}>
            <Text style={styles.badgeText}>{totalUnread} non lu{totalUnread > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Messages',
          headerLargeTitle: true,
          headerShadowVisible: false,
          headerLargeTitleShadowVisible: false,
          headerStyle: { backgroundColor: c.bg },
          headerRight: () =>
            user ? (
              <Pressable onPress={confirmSignOut} hitSlop={8} accessibilityLabel="Mon compte, se déconnecter">
                <Avatar person={{ id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role, profilePicture: user.profilePicture }} size={34} />
              </Pressable>
            ) : null,
        }}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.center} color={c.primary} />
      ) : isError ? (
        <Pressable style={styles.center} onPress={() => refetch()}>
          <Text style={[styles.emptyTitle, { color: c.text }]}>Connexion impossible</Text>
          <Text style={{ color: c.muted, textAlign: 'center' }}>Touche ici pour réessayer.</Text>
        </Pressable>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(conv) => String(conv.id)}
          contentInsetAdjustmentBehavior="automatic"
          refreshing={isRefetching}
          onRefresh={refetch}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={[styles.empty, { backgroundColor: c.surface }]}>
              <Text style={{ fontSize: 34 }}>💬</Text>
              <Text style={[styles.emptyTitle, { color: c.text }]}>
                {query ? 'Aucun résultat' : 'Aucune conversation pour l’instant'}
              </Text>
              <Text style={{ color: c.muted, textAlign: 'center', lineHeight: 20 }}>
                {query
                  ? 'Essaie un autre prénom ou nom.'
                  : `Tes échanges avec ${isStudent ? 'tes profs' : 'tes élèves'} apparaîtront ici.`}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <ConversationRow
              conversation={item}
              myId={user?.id}
              first={index === 0}
              last={index === conversations.length - 1}
            />
          )}
        />
      )}
    </>
  );
}

function ConversationRow({ conversation, myId, first, last }: { conversation: Conversation; myId?: number; first: boolean; last: boolean }) {
  const c = useColors();
  const { partner, lastMessage, unreadCount } = conversation;
  const unread = unreadCount > 0;
  const preview = lastMessage
    ? `${lastMessage.senderId === myId ? 'Toi : ' : ''}${messagePreview(lastMessage)}`
    : 'Nouvelle conversation';

  return (
    <Pressable
      onPress={() => openChat(partner.id)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? c.surfaceAlt : c.surface,
          borderTopLeftRadius: first ? radius.lg : 0,
          borderTopRightRadius: first ? radius.lg : 0,
          borderBottomLeftRadius: last ? radius.lg : 0,
          borderBottomRightRadius: last ? radius.lg : 0,
        },
      ]}
    >
      <Avatar person={partner} size={50} />
      <View style={[styles.rowBody, !last && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <View style={styles.rowLine}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {fullName(partner)}
          </Text>
          {lastMessage && (
            <Text style={{ color: unread ? c.primary : c.subtle, fontSize: 12, fontWeight: unread ? '700' : '400' }}>
              {formatWhen(lastMessage.createdAt)}
            </Text>
          )}
        </View>
        <View style={styles.rowLine}>
          <Text
            numberOfLines={1}
            style={[styles.preview, { color: unread ? c.text : c.muted, fontWeight: unread ? '600' : '400' }]}
          >
            {preview}
          </Text>
          {unread && (
            <View style={[styles.count, { backgroundColor: c.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Text style={{ color: c.subtle, fontSize: 12 }}>{roleLabel(partner.role)}</Text>
      </View>
    </Pressable>
  );
}

function ContactChip({ contact }: { contact: Contact }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => openChat(contact.id)}
      style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? c.surfaceAlt : c.surface }]}
    >
      <Avatar person={contact} size={52} />
      <Text style={[styles.chipName, { color: c.text }]} numberOfLines={1}>
        {contact.firstName}
      </Text>
      <Text style={{ color: c.primary, fontSize: 12, fontWeight: '700' }}>Écrire</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  headerBlock: { gap: 18, paddingTop: 4, paddingBottom: 10 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 16 },
  contactsBlock: { gap: 10 },
  contacts: { gap: 10, paddingRight: 8 },
  chip: { width: 92, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.lg },
  chipName: { fontSize: 13, fontWeight: '600', maxWidth: 80 },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, gap: 12 },
  rowBody: { flex: 1, gap: 3, paddingVertical: 14, paddingRight: 14 },
  rowLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  preview: { fontSize: 14, flex: 1 },
  count: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, padding: 28, borderRadius: radius.lg },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
