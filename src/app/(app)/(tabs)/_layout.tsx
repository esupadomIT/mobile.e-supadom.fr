import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useChat } from '@/lib/chat';
import { useColors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (on: IconName, off: IconName) =>
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? on : off} size={size} color={color as string} />;
  };

/** Onglets : Accueil, Messages (badge non lus), Disponibilités, Profil. */
export default function TabsLayout() {
  const c = useColors();
  const { data } = useChat();
  const unread = (data?.conversations ?? []).reduce((n, conv) => n + conv.unreadCount, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.subtle,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="accueil" options={{ title: 'Accueil', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: icon('chatbubbles', 'chatbubbles-outline'),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: c.accent, color: c.onAccent, fontWeight: '700' },
        }}
      />
      <Tabs.Screen name="dispos" options={{ title: 'Dispos', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
