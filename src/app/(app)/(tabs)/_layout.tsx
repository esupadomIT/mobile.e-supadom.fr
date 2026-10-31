import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { useChat } from '@/lib/chat';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (on: IconName, off: IconName) =>
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return (
      <View style={{ minWidth: 48, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? 'rgba(47,128,237,0.11)' : 'transparent' }}>
        <Ionicons name={focused ? on : off} size={Math.min(size, 23)} color={color as string} />
      </View>
    );
  };

/** Le chat est accessible depuis l'en-tête ; cinq destinations restent en bas. */
export default function TabsLayout() {
  const c = useColors();
  const { user } = useAuth();
  const { data } = useChat();
  const unread = (data?.conversations ?? []).reduce((n, conv) => n + conv.unreadCount, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.subtle,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="accueil" options={{ title: 'Accueil', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="trouver-prof" options={{ href: user?.role === 'STUDENT' ? '/trouver-prof' : null, title: 'Trouver un prof', tabBarLabel: 'Un prof', tabBarAccessibilityLabel: 'Trouver un prof', tabBarIcon: icon('search', 'search-outline') }} />
      <Tabs.Screen name="dispos" options={{ title: 'Dispos', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarLabel: 'Alertes',
          tabBarIcon: icon('notifications', 'notifications-outline'),
          tabBarBadge: unread > 99 ? '99+' : unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: c.notification, color: c.onNotification, fontWeight: '700' },
        }}
      />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
