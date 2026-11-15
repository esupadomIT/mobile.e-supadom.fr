import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { useChat } from '@/lib/chat';
import { useAuth } from '@/lib/auth';
import { fonts, useColors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (on: IconName, off: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean; size: number }) {
    const c = useColors();
    return (
      <View style={{ width: 44, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? c.primarySoft : 'transparent' }}>
        <Ionicons name={focused ? on : off} size={21} color={color as string} />
      </View>
    );
  };

/**
 * Barre d'onglets de la maquette Figma : Accueil · Planning · Messages · Profil.
 * Les notifications s'ouvrent depuis la cloche de l'en-tête.
 */
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
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.semibold, marginTop: 2 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="accueil" options={{ title: 'Accueil', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="trouver-prof" options={{ href: user?.role === 'STUDENT' ? '/trouver-prof' : null, title: 'Trouver un prof', tabBarLabel: 'Un prof', tabBarAccessibilityLabel: 'Trouver un prof', tabBarIcon: icon('search', 'search-outline') }} />
      <Tabs.Screen name="planning" options={{ title: "Planning", tabBarIcon: icon("calendar", "calendar-outline") }} />
      <Tabs.Screen name="dispos" options={{ href: null, title: 'Disponibilités', tabBarLabel: 'Planning', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen
        name="messagerie"
        options={{
          title: 'Messages',
          tabBarIcon: icon('chatbubble', 'chatbubble-outline'),
          tabBarBadge: unread > 99 ? '99+' : unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: c.notification, color: c.onNotification, fontFamily: fonts.bold, fontSize: 10 },
        }}
        listeners={{
          // La messagerie est un écran de la pile (avec retour) : l'onglet l'ouvre par-dessus.
          tabPress: (e) => {
            e.preventDefault();
            router.push('/messages');
          },
        }}
      />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
