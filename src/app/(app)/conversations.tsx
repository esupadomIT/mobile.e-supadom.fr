import { useQuery } from '@tanstack/react-query';
import { Link, Stack } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatWhen, initials } from '@/lib/format';
import { useColors } from '@/theme';
import type { Conversation } from '@/types';

export default function ConversationsScreen() {
  const { user, signOut } = useAuth();
  const c = useColors();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: api.conversations,
  });

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
          <Text style={{ color: c.muted }}>Impossible de charger les messages. Toucher pour réessayer.</Text>
        </Pressable>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={!data?.length ? styles.center : undefined}
          ListEmptyComponent={
            <Text style={{ color: c.muted, textAlign: 'center' }}>
              {user?.role === 'PROF'
                ? "Aucune conversation pour l'instant."
                : "Aucune conversation. Ton prof pourra t'écrire ici."}
            </Text>
          }
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: c.border }]} />
          )}
          renderItem={({ item }) => <ConversationRow conversation={item} myId={user?.id} />}
        />
      )}
    </>
  );
}

function ConversationRow({ conversation, myId }: { conversation: Conversation; myId?: string }) {
  const c = useColors();
  const { otherUser, lastMessage, unreadCount } = conversation;
  const unread = unreadCount > 0;
  const preview = lastMessage
    ? `${lastMessage.senderId === myId ? 'Toi : ' : ''}${lastMessage.content}`
    : 'Nouvelle conversation';

  return (
    <Link href={{ pathname: '/chat/[id]', params: { id: conversation.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.border : c.surface }]}>
        <View style={[styles.avatar, { backgroundColor: c.primary }]}>
          <Text style={styles.avatarText}>{initials(otherUser.firstName, otherUser.lastName)}</Text>
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
              {otherUser.firstName} {otherUser.lastName}
            </Text>
            {lastMessage && (
              <Text style={{ color: unread ? c.primary : c.muted, fontSize: 12 }}>
                {formatWhen(lastMessage.createdAt)}
              </Text>
            )}
          </View>
          <View style={styles.rowTop}>
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

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 76 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  preview: { fontSize: 14, flex: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
