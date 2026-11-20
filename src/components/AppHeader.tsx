import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';
import { LIST_POLL_MS } from '@/config';
import { useChat } from '@/lib/chat';
import { useColors } from '@/theme';

/**
 * En-tête de la maquette Figma (« En-tête ») : retour, logo, cloche avec pastille
 * quand il y a des messages non lus.
 */
export function AppHeader({ onBack, showBack = true }: { onBack?: () => void; showBack?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useChat(LIST_POLL_MS);
  const unread = (data?.conversations ?? []).reduce((n, conv) => n + conv.unreadCount, 0);

  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/accueil')));

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, paddingTop: insets.top + 16 }]}>
      {showBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={back} hitSlop={14}>
          <Ionicons name="arrow-back" size={19} color={c.link} />
        </Pressable>
      ) : null}
      <BrandLogo style={styles.logo} />
      <View style={{ flex: 1 }} pointerEvents="none" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Notifications${unread ? `, ${unread} non lues` : ''}`}
        onPress={() => router.push('/notifications')}
        hitSlop={10}
        style={({ pressed }) => [styles.bell, { backgroundColor: c.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}
      >
        <Ionicons name="notifications-outline" size={21} color={c.link} />
        {unread > 0 ? <View style={[styles.dot, { backgroundColor: c.notification, borderColor: c.surfaceAlt }]} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, zIndex: 2 },
  logo: { width: 140, height: 38, flexShrink: 1 },
  bell: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  dot: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
});
