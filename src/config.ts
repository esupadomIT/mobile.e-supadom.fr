/**
 * URL du backend mobile. Surchargée par EXPO_PUBLIC_API_URL (fichier .env)
 * pour pointer vers un backend local pendant le développement.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'https://admin.mobile.e-supadom.fr'
).replace(/\/$/, '');

/** Le serveur Socket.IO est servi par le même backend. */
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? API_URL;
