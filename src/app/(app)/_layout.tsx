import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { MessagesButton } from '@/components/MessagesButton';
import { useColors } from '@/theme';

/** Zone connectée : protège les écrans. */
export default function AppLayout() {
  const { token, isLoading } = useAuth();
  const c = useColors();

  if (isLoading) return null;
  if (!token) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        contentStyle: { backgroundColor: c.bg },
        headerBackTitle: 'Retour',
        headerRight: () => <MessagesButton />,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="messages" options={{ headerShown: false }} />
    </Stack>
  );
}
