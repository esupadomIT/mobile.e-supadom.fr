import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LIST_POLL_MS } from '@/config';
import { useChat } from '@/lib/chat';
import { useColors } from '@/theme';

/** Action partagée des en-têtes fixes de l'espace connecté. */
export function MessagesButton({ inverse = false }: { inverse?: boolean }) {
  const c = useColors();
  const { data } = useChat(LIST_POLL_MS);
  const unread = (data?.conversations ?? []).reduce((count, conversation) => count + conversation.unreadCount, 0);
  return (
    <Link href="/(app)/messages" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Messages${unread ? `, ${unread} non lus` : ''}`}
        hitSlop={8}
        style={({ pressed }) => [styles.button, { backgroundColor: inverse ? 'rgba(255,255,255,0.16)' : c.primarySoft, opacity: pressed ? 0.65 : 1 }]}
      >
        <Ionicons name="chatbubbles-outline" size={23} color={inverse ? '#FFFFFF' : c.primary} />
        {unread > 0 ? <View pointerEvents="none" style={[styles.badge, { backgroundColor: c.notification }]}><Text style={{ color: c.onNotification, fontSize: 10, fontWeight: '800' }}>{unread > 99 ? '99+' : unread}</Text></View> : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -3, top: -3, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
});
