import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BrandHeader, ScreenHeader } from '@/components/ScreenHeader';
import { Notice, SecondaryButton } from '@/components/ui';
import { LIST_POLL_MS } from '@/config';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { sortedConversations, useChat } from '@/lib/chat';
import { formatWhen, fullName, messagePreview } from '@/lib/format';
import { radius, useColors } from '@/theme';

/** Les alertes disponibles actuellement sont les messages non lus du compte. */
export default function NotificationsScreen() {
  const c = useColors();
  const chat = useChat(LIST_POLL_MS);
  const { refreshing, onRefresh } = useManualRefresh(() => chat.refetch());
  const unread = sortedConversations(chat.data).filter((conversation) => conversation.unreadCount > 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BrandHeader title="Notifications" />
      <FlatList
        style={{ flex: 1 }}
        data={chat.isError ? [] : unread}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={<ScreenHeader embedded title="Notifications" subtitle="Tes messages non lus" />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={{ margin: 20, padding: 24, gap: 16, borderRadius: radius.lg, backgroundColor: c.surface, alignItems: 'center' }}>
            <Ionicons name="notifications-outline" size={36} color={c.primary} />
            {chat.isError ? <><Notice kind="error">Impossible de récupérer tes notifications.</Notice><SecondaryButton title="Réessayer" onPress={() => void chat.refetch()} /></> : <>
              <Text style={{ color: c.text, fontSize: 19, fontWeight: '700', textAlign: 'center' }}>{chat.isLoading ? 'Tes notifications arrivent…' : 'Tu es à jour'}</Text>
              <Text style={{ color: c.muted, lineHeight: 21, textAlign: 'center' }}>{chat.isLoading ? 'Nous récupérons tes messages non lus.' : 'Les nouveaux messages apparaîtront ici.'}</Text>
            </>}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.unreadCount} messages non lus de ${fullName(item.partner)}`}
            onPress={() => router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(item.partner.id) } })}
            style={({ pressed }) => ({ marginHorizontal: 20, marginTop: 12, padding: 18, borderRadius: radius.lg, backgroundColor: pressed ? c.surfaceAlt : c.surface, flexDirection: 'row', gap: 12, alignItems: 'center' })}
          >
            <Avatar person={item.partner} size={44} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{fullName(item.partner)}</Text>
              <Text numberOfLines={2} style={{ color: c.muted, lineHeight: 20 }}>{item.lastMessage ? messagePreview(item.lastMessage) : 'Nouveau message'}</Text>
              {item.lastMessage ? <Text style={{ color: c.subtle, fontSize: 12 }}>{formatWhen(item.lastMessage.createdAt)}</Text> : null}
            </View>
            <View style={{ minWidth: 24, padding: 5, borderRadius: radius.pill, alignItems: 'center', backgroundColor: c.notification }}><Text style={{ color: c.onNotification, fontSize: 12, fontWeight: '700' }}>{item.unreadCount}</Text></View>
          </Pressable>
        )}
      />
    </View>
  );
}
