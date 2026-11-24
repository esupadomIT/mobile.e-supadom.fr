import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ParentMessages } from '@/components/ParentMessages';
import { InboxEmpty, InboxFilters, InboxRow } from '@/components/Messaging';
import { SecondaryButton } from '@/components/ui';
import { AttachmentCard } from '@/components/ChatMessage';
import { LIST_POLL_MS } from '@/config';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { useAuth } from '@/lib/auth';
import { sortedConversations, startableContacts, useChat } from '@/lib/chat';
import { conversationWhen, fullName, messagePreview } from '@/lib/format';
import { fonts, useColors } from '@/theme';
export default function MessagesScreen() {
  const { user } = useAuth();
  return user?.role === 'PARENT' ? <ParentMessages /> : <Inbox />;
}
function Inbox() {
  const c = useColors();
  const { user } = useAuth();
  const query = useChat(LIST_POLL_MS);
  const { refreshing, onRefresh } = useManualRefresh(() => query.refetch());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const all = sortedConversations(query.data);
  const unread = all.reduce((n, x) => n + x.unreadCount, 0);
  const match = (text: string) => text.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr'));
  const list = all.filter(
    (x) =>
      (filter !== 'unread' || x.unreadCount > 0) &&
      (filter !== 'files' || !!x.lastMessage?.attachments?.length) &&
      match(fullName(x.partner) + ' ' + (x.lastMessage ? messagePreview(x.lastMessage) : '')),
  );
  const contacts = startableContacts(query.data, user).filter((x) => match(fullName(x)));
  const open = (id: number) => router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(id) } });
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={list}
        keyExtractor={(x) => String(x.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 14 }}>
            <View style={{ gap: 4 }}>
              <Text accessibilityRole="header" style={[s.title, { color: c.text }]}>
                Messages
              </Text>
              <Text style={[s.subtitle, { color: c.muted }]}>Échangez avec votre équipe pédagogique.</Text>
            </View>
            <InboxFilters search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} unread={unread} />
            {filter === 'files' ? (
              <Text style={[s.subtitle, { color: c.muted }]}>
                Pièces jointes des derniers messages. Ouvrez une conversation pour consulter tout son historique.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator color={c.primary} />
          ) : query.isError ? (
            <SecondaryButton title="Connexion impossible · Réessayer" onPress={() => void query.refetch()} />
          ) : (
            <InboxEmpty filtered={!!search || filter !== 'all'} />
          )
        }
        renderItem={({ item }) => (
          <View style={{ gap: 6 }}>
            <InboxRow
              partner={item.partner}
              preview={item.lastMessage ? messagePreview(item.lastMessage) : 'Nouvelle conversation'}
              date={item.lastMessage ? conversationWhen(item.lastMessage.createdAt) : undefined}
              unread={item.unreadCount}
              onPress={() => open(item.partner.id)}
            />
            {filter === 'files'
              ? item.lastMessage?.attachments?.map((a) => <AttachmentCard key={a.id} attachment={a} />)
              : null}
          </View>
        )}
        ListFooterComponent={
          filter === 'all' && contacts.length ? (
            <View style={{ gap: 8, marginTop: 16 }}>
              <Text style={[s.subtitle, { color: c.muted }]}>Démarrer une conversation</Text>
              {contacts.map((x) => (
                <InboxRow key={x.id} partner={x} preview="Écrire un message" onPress={() => open(x.id)} />
              ))}
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 24, flexGrow: 1 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30 },
  subtitle: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 },
});
