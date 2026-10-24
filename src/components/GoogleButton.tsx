import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { SecondaryButton } from '@/components/ui';
import { GOOGLE_CLIENT_IDS } from '@/config';

WebBrowser.maybeCompleteAuthSession();

/** true si la connexion Google est configurée pour la plateforme courante. */
export const googleEnabled =
  Platform.OS === 'ios' ? !!GOOGLE_CLIENT_IDS.ios : Platform.OS === 'android' ? !!GOOGLE_CLIENT_IDS.android : !!GOOGLE_CLIENT_IDS.web;

/**
 * « Continuer avec Google » : obtient un id_token Google (expo-auth-session) et le
 * passe à `onIdToken` (POST /api/v1/auth/google côté API). À n'afficher que si
 * `googleEnabled` (le hook exige le client ID de la plateforme).
 */
export function GoogleButton({ onIdToken, onError, busy }: { onIdToken: (idToken: string) => void; onError: (message: string) => void; busy?: boolean }) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    webClientId: GOOGLE_CLIENT_IDS.web,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) onIdToken(idToken);
      else onError('Google n’a pas renvoyé d’identifiant. Merci de réessayer.');
    } else if (response?.type === 'error') {
      onError('La connexion Google a échoué. Merci de réessayer.');
    }
  }, [response, onIdToken, onError]);

  return (
    <SecondaryButton
      title="Continuer avec Google"
      onPress={() => void promptAsync()}
      disabled={!request}
      loading={busy}
      icon={
        <View style={styles.g}>
          <Text style={styles.gText}>G</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  g: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E3E8F0' },
  gText: { color: '#4285F4', fontWeight: '800', fontSize: 14 },
});
