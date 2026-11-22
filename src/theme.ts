import { useAppearance } from '@/lib/appearance';
import { useColorScheme } from 'react-native';

// Design system Figma « e-Supadom » (page 🎨 Design System - Fondation).
// Variables Figma entre parenthèses : action/primary, surface/card, text/primary…
const light = {
  bg: '#F5F8FA', // background/subtle
  surface: '#FFFFFF', // surface/card
  surfaceAlt: '#EDF3FA', // surface/info
  text: '#1B3048', // text/primary
  muted: '#617185', // text/secondary
  subtle: '#8695A6',
  border: '#DCE4EA', // border/default
  focus: '#257DEF', // border/focus
  link: '#257DEF', // text/link
  primary: '#257DEF', // action/primary
  primaryPressed: '#1B66CC',
  primarySoft: '#EDF3FA',
  onPrimary: '#FFFFFF', // text/inverse
  accent: '#76C8AA', // brand/mint
  accentSoft: '#E3F5EE',
  onAccent: '#1D5C46',
  yellow: '#FFD814',
  yellowPressed: '#F0C800',
  onYellow: '#1B2433',
  bubbleMine: '#EDF3FA',
  bubbleOther: '#FFFFFF',
  danger: '#B53E3E', // text/danger
  notification: '#D64545',
  onNotification: '#FFFFFF',
  dangerSoft: '#FFF1F0', // surface/danger
  overlay: 'rgba(12, 28, 49, 0.42)',
};

const dark: typeof light = {
  bg: '#0D1624',
  surface: '#152235',
  surfaceAlt: '#1B2D45',
  text: '#EAF1FA',
  muted: '#ADBED3',
  subtle: '#7F92A9',
  border: '#354B65',
  focus: '#8FB9FF',
  link: '#8FB9FF',
  primary: '#257DEF',
  primaryPressed: '#1B66CC',
  primarySoft: '#1B2D45',
  onPrimary: '#FFFFFF',
  accent: '#76C8AA',
  accentSoft: '#173A31',
  onAccent: '#BDEBD9',
  yellow: '#FFD814',
  yellowPressed: '#F0C800',
  onYellow: '#1B2433',
  bubbleMine: '#1B2D45',
  bubbleOther: '#152235',
  danger: '#FFAAA8',
  notification: '#E25C5C',
  onNotification: '#FFFFFF',
  dangerSoft: '#3D222B',
  overlay: 'rgba(0, 0, 0, 0.3)',
};

export type Colors = typeof light;

/** Mode sombre effectif (réglage de l'app, sinon celui du téléphone). */
export function useIsDark(): boolean {
  const system = useColorScheme(); const { mode } = useAppearance();
  return (mode === 'system' ? system : mode) === 'dark';
}

export function useColors(): Colors {
  return useIsDark() ? dark : light;
}

/** Plus Jakarta Sans (chargée dans src/app/_layout.tsx depuis assets/fonts). */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const fontFiles = {
  [fonts.regular]: require('../assets/fonts/PlusJakartaSans_400Regular.ttf'),
  [fonts.medium]: require('../assets/fonts/PlusJakartaSans_500Medium.ttf'),
  [fonts.semibold]: require('../assets/fonts/PlusJakartaSans_600SemiBold.ttf'),
  [fonts.bold]: require('../assets/fonts/PlusJakartaSans_700Bold.ttf'),
  [fonts.extrabold]: require('../assets/fonts/PlusJakartaSans_800ExtraBold.ttf'),
};

/** Styles de texte du design system (taille, police, interligne 1.5). */
export const typography = {
  title: { fontFamily: fonts.bold, fontSize: 27, lineHeight: 40 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22 },
  cardText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  button: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16 },
  captionRegular: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
} as const;

/** Couleurs d'avatar (initiales), choisies de façon stable à partir de l'id. */
export const AVATAR_COLORS = ['#257DEF', '#0EA5A4', '#7C5CFF', '#F97316', '#E11D74', '#16A34A', '#0284C7', '#B45309'];

export const radius = { sm: 12, md: 14, lg: 24, pill: 999 };

/** Ombre douce (iOS) / élévation (Android). */
export const shadow = {
  shadowColor: '#173B68',
  shadowOpacity: 0.055,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;
