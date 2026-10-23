import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api, ApiError } from '@/lib/api';

let currentToken: string | null = null;

// Affiche les notifications même quand l'app est au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Demande la permission, récupère le token Expo Push et l'enregistre côté API.
 * Ne fonctionne que sur un appareil physique avec un build de développement
 * (pas Expo Go sur Android, pas le simulateur iOS).
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  const status =
    existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId || projectId === 'REMPLACER_PAR_EAS_PROJECT_ID') {
    console.warn('[push] projectId EAS manquant : lancer `eas init` puis rebuild.');
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = data;
    await api.registerDevice(data, Platform.OS);
    return data;
  } catch (e) {
    // 404 : la route /api/v1/devices n'existe pas encore côté API.
    if (!(e instanceof ApiError && e.status === 404)) console.warn('[push] enregistrement impossible', e);
    return currentToken;
  }
}

export async function unregisterPush() {
  const token = currentToken;
  currentToken = null;
  if (token) await api.unregisterDevice(token);
}
