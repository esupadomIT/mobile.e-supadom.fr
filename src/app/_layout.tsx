import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { StartupScreen } from '@/components/StartupScreen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CHAT_KEY } from '@/lib/chat';
import '@/lib/push'; // enregistre le handler d'affichage des notifications

const LAST_HANDLED_KEY = 'esupadom.lastHandledNotification';
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppContent() {
  const { isLoading } = useAuth();
  const [logoReady, setLogoReady] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const showStartup = isLoading || !introFinished;

  const onLogoReady = useCallback(() => {
    SplashScreen.hide();
    setLogoReady(true);
  }, []);

  useEffect(() => {
    if (!logoReady) return;
    // Laisse voir le logo et sa barre même si la session est restaurée immédiatement.
    const timer = setTimeout(() => setIntroFinished(true), 1000);
    return () => clearTimeout(timer);
  }, [logoReady]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={showStartup ? 'dark' : 'auto'} />
      <Stack screenOptions={{ headerShown: false }} />
      {showStartup ? <StartupScreen onReady={onLogoReady} /> : null}
    </View>
  );
}

/**
 * Ouvre la conversation quand l'utilisateur touche une notification push.
 * Le backend envoie `data: { partnerId }` (id de l'expéditeur du message).
 * `useLastNotificationResponse` renvoie la dernière notification touchée même
 * après un redémarrage : l'identifiant traité est mémorisé pour ne pas rouvrir
 * la même conversation à chaque lancement de l'app.
 */
function useNotificationTapRedirect() {
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!lastResponse || lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = lastResponse.notification.request.identifier;
    const partnerId = lastResponse.notification.request.content.data?.partnerId;
    if (typeof partnerId !== 'number' && typeof partnerId !== 'string') return;
    (async () => {
      const handled = await SecureStore.getItemAsync(LAST_HANDLED_KEY).catch(() => null);
      if (handled === id) return;
      await SecureStore.setItemAsync(LAST_HANDLED_KEY, id).catch(() => undefined);
      router.push({ pathname: '/chat/[partnerId]', params: { partnerId: String(partnerId) } });
    })();
  }, [lastResponse]);
}

/** Un push reçu app ouverte : rafraîchit le chat tout de suite. */
function useRefreshOnNotification(queryClient: QueryClient) {
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: CHAT_KEY });
      void queryClient.invalidateQueries({ queryKey: ['messages'] });
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
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}
