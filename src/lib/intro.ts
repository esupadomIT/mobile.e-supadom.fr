import * as SecureStore from 'expo-secure-store';

/** Écrans d'intro (maquette « Launch Screens - Intro ») : vus une seule fois par appareil. */
export const INTRO_SEEN_KEY = 'esupadom.introSeen';

export async function markIntroSeen() {
  await SecureStore.setItemAsync(INTRO_SEEN_KEY, '1').catch(() => undefined);
}
