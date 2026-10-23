/**
 * Hôte du backend mobile (API NestJS, routes sous /api). Surchargé par
 * EXPO_PUBLIC_API_URL (fichier .env) pour pointer vers un backend local.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'https://admin.mobile.e-supadom.fr'
).replace(/\/$/, '');

/**
 * Site qui sert les pièces jointes du chat (chemins relatifs « /uploads/… »
 * renvoyés par l'API).
 */
export const FILES_URL = (process.env.EXPO_PUBLIC_FILES_URL ?? 'https://e-supadom.fr').replace(/\/$/, '');

/** Rafraîchissement du chat en attendant le temps réel authentifié côté API. */
export const CHAT_POLL_MS = 5_000;
export const LIST_POLL_MS = 15_000;
