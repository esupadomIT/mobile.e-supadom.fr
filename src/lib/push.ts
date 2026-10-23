import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api, ApiError } from '@/lib/api';

let currentToken: string | null = null;

/** Discussion affichée à l'écran : ses notifications ne sont pas montrées (déjà visibles). */
let activePartnerId: number | null = null;
export function setActiveChatPartner(partnerId: number | null) {
  activePartnerId = partnerId;
}

// Affiche les notifications même quand l'app est au premier plan, sauf celles de
// la discussion ouverte (le message apparaît directement dans le fil).
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const partnerId = Number(notification.request.content.data?.partnerId);
    const visible = !(activePartnerId !== null && partnerId === activePartnerId);
    return { shouldShowBanner: visible, shouldShowList: visible, shouldPlaySound: visible, shouldSetBadge: true };
  },
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
    // 404 : API pas encore à jour (route /api/v1/devices absente).
    if (!(e instanceof ApiError && e.status === 404)) console.warn('[push] enregistrement impossible', e);
    return currentToken;
  }
}

export async function unregisterPush() {
  const token = currentToken;
  currentToken = null;
  if (token) await api.unregisterDevice(token);
}
