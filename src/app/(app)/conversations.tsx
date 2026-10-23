import { Link, Stack } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { LIST_POLL_MS } from '@/config';
import { useAuth } from '@/lib/auth';
import { sortedConversations, startableContacts, useChat } from '@/lib/chat';
import { formatWhen, fullName, messagePreview, roleLabel } from '@/lib/format';
import { useColors } from '@/theme';
import type { Contact, Conversation } from '@/types';

type Row = { kind: 'conversation'; item: Conversation } | { kind: 'contact'; item: Contact };

export default function ConversationsScreen() {
  const { user, signOut } = useAuth();
  const c = useColors();
  const { data, isLoading, isError, refetch, isRefetching } = useChat(LIST_POLL_MS);

  const sections = useMemo(() => {
    const conversations = sortedConversations(data).map((item): Row => ({ kind: 'conversation', item }));
    const contacts = startableContacts(data, user).map((item): Row => ({ kind: 'contact', item }));
    const result = [{ title: '', data: conversations }];
    if (contacts.length) {
      result.push({ title: user?.role === 'STUDENT' ? 'Écrire à un de tes profs' : 'Écrire à un de tes élèves', data: contacts });
    }
    return result;
  }, [data, user]);

  const isEmpty = !sections.some((s) => s.data.length);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Messages',
          headerRight: () => (
            <Pressable onPress={signOut} hitSlop={8}>
              <Text style={{ color: c.primary, fontSize: 15 }}>Déconnexion</Text>
            </Pressable>
          ),
        }}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.center} />
      ) : isError ? (
        <Pressable style={styles.center} onPress={() => refetch()}>
          <Text style={{ color: c.muted, textAlign: 'center' }}>
            Impossible de charger les messages. Touche pour réessayer.
          </Text>
        </Pressable>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(row) => `${row.kind}-${row.item.id}`}
          refreshing={isRefetching}
          onRefresh={refetch}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={isEmpty ? styles.center : undefined}
          ListEmptyComponent={
            <Text style={{ color: c.muted, textAlign: 'center' }}>
              Aucune conversation pour l’instant. Tes échanges avec{' '}
              {user?.role === 'STUDENT' ? 'tes profs' : 'tes élèves'} apparaîtront ici.
            </Text>
          }
          renderSectionHeader={({ section }) =>
            section.title ? (
              <Text style={[styles.sectionTitle, { color: c.muted }]}>{section.title}</Text>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.border }]} />}
          renderItem={({ item: row }) =>
            row.kind === 'conversation' ? (
              <ConversationRow conversation={row.item} myId={user?.id} />
            ) : (
              <ContactRow contact={row.item} />
            )
          }
        />
      )}
    </>
  );
}

function ConversationRow({ conversation, myId }: { conversation: Conversation; myId?: number }) {
  const c = useColors();
  const { partner, lastMessage, unreadCount } = conversation;
  const unread = unreadCount > 0;
  const preview = lastMessage
    ? `${lastMessage.senderId === myId ? 'Toi : ' : ''}${messagePreview(lastMessage)}`
    : 'Nouvelle conversation';

  return (
    <Link href={{ pathname: '/chat/[partnerId]', params: { partnerId: String(partner.id) } }} asChild>
      <Pressable style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.border : c.surface }]}>
        <Avatar person={partner} />
        <View style={styles.rowBody}>
          <View style={styles.rowLine}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
              {fullName(partner)}
            </Text>
            {lastMessage && (
              <Text style={{ color: unread ? c.primary : c.muted, fontSize: 12 }}>
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
              <View style={[styles.badge, { backgroundColor: c.primary }]}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function ContactRow({ contact }: { contact: Contact }) {
  const c = useColors();
  return (
    <Link href={{ pathname: '/chat/[partnerId]', params: { partnerId: String(contact.id) } }} asChild>
      <Pressable style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.border : c.surface }]}>
        <Avatar person={contact} size={40} />
        <View style={styles.rowBody}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {fullName(contact)}
          </Text>
          <Text style={{ color: c.muted, fontSize: 13 }}>{roleLabel(contact.role)}</Text>
        </View>
        <Text style={{ color: c.primary, fontWeight: '600' }}>Écrire</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 76 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  rowBody: { flex: 1, gap: 4 },
  rowLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  preview: { fontSize: 14, flex: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
