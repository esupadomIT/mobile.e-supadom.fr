import { useColorScheme } from 'react-native';

// Palette du site e-supadom.fr : BLEU #2F80ED (bandeau, liens), VERT #6EE7B7
// (« Inscription », mots mis en avant), JAUNE #FFD814 (boutons d'action « Nous découvrir »).
const light = {
  bg: '#F5F8FC',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF3FA',
  text: '#152B46',
  muted: '#60738B',
  subtle: '#76869A',
  border: '#DFE8F2',
  primary: '#2F80ED',
  primaryPressed: '#2468C4',
  primarySoft: '#E7F1FF',
  onPrimary: '#FFFFFF',
  accent: '#6EE7B7',
  accentSoft: '#E3FBF2',
  onAccent: '#145C47',
  yellow: '#FFD814',
  yellowPressed: '#F0C800',
  onYellow: '#1B2433',
  bubbleMine: '#2F80ED',
  bubbleOther: '#FFFFFF',
  danger: '#D92D20',
  notification: '#E41E3F',
  onNotification: '#FFFFFF',
  dangerSoft: '#FEF0EF',
  overlay: 'rgba(12, 28, 49, 0.42)',
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
  accentSoft: '#B5EBD8',
  onAccent: '#0B3B2C',
  yellow: '#FFD814',
  yellowPressed: '#F0C800',
  onYellow: '#1B2433',
  bubbleMine: '#2F80ED',
  bubbleOther: '#1F2633',
  danger: '#F97066',
  notification: '#E41E3F',
  onNotification: '#FFFFFF',
  dangerSoft: '#3A1D1B',
  overlay: 'rgba(0, 0, 0, 0.3)',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Couleurs d'avatar (initiales), choisies de façon stable à partir de l'id. */
export const AVATAR_COLORS = ['#2F80ED', '#0EA5A4', '#7C5CFF', '#F97316', '#E11D74', '#16A34A', '#0284C7', '#B45309'];

export const radius = { sm: 12, md: 16, lg: 24, pill: 999 };

/** Ombre douce (iOS) / élévation (Android). */
export const shadow = {
  shadowColor: '#173B68',
  shadowOpacity: 0.055,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;
