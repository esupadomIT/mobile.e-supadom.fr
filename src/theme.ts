import { useColorScheme } from 'react-native';

// Palette e-Supadom (site : bleu #2864FF, vert d'eau #6EE7B7, encre #263546).
const light = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2FA',
  text: '#1B2433',
  muted: '#6A7C92',
  subtle: '#97A3B6',
  border: '#E3E8F0',
  primary: '#2864FF',
  primaryPressed: '#1F4FD1',
  primarySoft: '#E7F0FF',
  onPrimary: '#FFFFFF',
  accent: '#6EE7B7',
  bubbleMine: '#2864FF',
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
  primary: '#5B8CFF',
  primaryPressed: '#4A78E6',
  primarySoft: '#1B2A4A',
  onPrimary: '#FFFFFF',
  accent: '#4FD1A0',
  bubbleMine: '#3B6EF5',
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
export const AVATAR_COLORS = ['#2864FF', '#0EA5A4', '#7C5CFF', '#F97316', '#E11D74', '#16A34A', '#0284C7', '#B45309'];

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

/** Ombre douce (iOS) / élévation (Android). */
export const shadow = {
  shadowColor: '#101828',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
