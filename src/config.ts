/**
 * Hôte du backend mobile (API NestJS, routes sous /api). Surchargé par
 * EXPO_PUBLIC_API_URL (fichier .env) pour pointer vers un backend local.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'https://admin.mobile.e-supadom.fr'
).replace(/\/$/, '');

/**
 * Site e-Supadom de l'environnement : pièces jointes du chat (chemins relatifs
 * « /uploads/… » renvoyés par l'API) et liens d'inscription.
 */
export const FILES_URL = (process.env.EXPO_PUBLIC_FILES_URL ?? 'https://e-supadom.fr').replace(/\/$/, '');
export const SITE_URL = FILES_URL;

/**
 * Connexion « Continuer avec Google » : client IDs OAuth (console Google Cloud).
 * Le bouton n'apparaît que si l'ID de la plateforme courante est renseigné.
 * Ne fonctionne pas dans Expo Go : build de développement requis.
 */
export const GOOGLE_CLIENT_IDS = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
};

/** Rafraîchissement du chat en attendant le temps réel authentifié côté API. */
export const CHAT_POLL_MS = 5_000;
export const LIST_POLL_MS = 15_000;
