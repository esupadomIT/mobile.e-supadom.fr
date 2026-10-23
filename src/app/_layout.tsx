import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { AuthProvider } from '@/lib/auth';
import '@/lib/push'; // enregistre le handler d'affichage des notifications

/** Ouvre la conversation quand l'utilisateur touche une notification push. */
function useNotificationTapRedirect() {
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const id = lastResponse?.notification.request.content.data?.conversationId;
    if (typeof id === 'string') {
      router.push({ pathname: '/chat/[id]', params: { id } });
    }
  }, [lastResponse]);
}

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );
  useNotificationTapRedirect();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
