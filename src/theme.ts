import { useColorScheme } from 'react-native';

// Palette du site e-supadom.fr : BLEU #2F80ED (bandeau, liens), VERT #6EE7B7
// (« Inscription », mots mis en avant), JAUNE #FFD814 (boutons d'action « Nous découvrir »).
const light = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2FA',
  text: '#1B2433',
  muted: '#6A7C92',
  subtle: '#97A3B6',
  border: '#E3E8F0',
  primary: '#2F80ED',
  primaryPressed: '#2468C4',
  primarySoft: '#E7F1FF',
  onPrimary: '#FFFFFF',
  accent: '#6EE7B7',
  accentSoft: '#E3FBF2',
  onAccent: '#0B3B2C',
  yellow: '#FFD814',
  yellowPressed: '#F0C800',
  onYellow: '#1B2433',
  bubbleMine: '#2F80ED',
  bubbleOther: '#FFFFFF',
  danger: '#D92D20',
  dangerSoft: '#FEF0EF',
  overlay: 'rgba(16, 24, 40, 0.06)',
};

const dark: typeof light = {
  bg: '#0D1117',
  surface: '#161B24',
  surfaceAlt: '#1D2430',
  text: '#EEF2F7',
  muted: '#9AA7B8',
  subtle: '#6B7789',
  border: '#262E3B',
  primary: '#4D94F5',
  primaryPressed: '#3A7FDE',
  primarySoft: '#16294A',
  onPrimary: '#FFFFFF',
  accent: '#6EE7B7',
  accentSoft: '#123A2E',
  onAccent: '#0B3B2C',
  yellow: '#FFD814',
  yellowPressed: '#F0C800',
  onYellow: '#1B2433',
  bubbleMine: '#2F80ED',
  bubbleOther: '#1F2633',
  danger: '#F97066',
  dangerSoft: '#3A1D1B',
  overlay: 'rgba(0, 0, 0, 0.3)',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Couleurs d'avatar (initiales), choisies de façon stable à partir de l'id. */
export const AVATAR_COLORS = ['#2F80ED', '#0EA5A4', '#7C5CFF', '#F97316', '#E11D74', '#16A34A', '#0284C7', '#B45309'];

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

/** Ombre douce (iOS) / élévation (Android). */
export const shadow = {
  shadowColor: '#101828',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
