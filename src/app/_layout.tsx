import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { AuthProvider } from '@/lib/auth';
import { CHAT_KEY } from '@/lib/chat';
import '@/lib/push'; // enregistre le handler d'affichage des notifications

/**
 * Ouvre la conversation quand l'utilisateur touche une notification push.
 * Le backend envoie `data: { partnerId }` (id de l'expéditeur du message).
 */
function useNotificationTapRedirect() {
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const partnerId = lastResponse?.notification.request.content.data?.partnerId;
    if (typeof partnerId === 'number' || typeof partnerId === 'string') {
      router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(partnerId) } });
    }
  }, [lastResponse]);
}

/** Un push reçu app ouverte : rafraîchit le chat tout de suite. */
function useRefreshOnNotification(queryClient: QueryClient) {
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: CHAT_KEY });
    });
    return () => sub.remove();
  }, [queryClient]);
}

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );
  useNotificationTapRedirect();
  useRefreshOnNotification(queryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
