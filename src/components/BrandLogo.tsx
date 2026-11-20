import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { useIsDark } from '@/theme';

const LOGO = require('../../assets/logo-header.png');
/** Maquettes Figma en mode sombre : chapeau, demi-cercle et texte en blanc, vague et tiret verts. */
const LOGO_DARK = require('../../assets/logo-header-dark.png');

/** Logo « e-Supadom » de l'en-tête, en version claire ou sombre selon l'apparence. */
export function BrandLogo({ style }: { style?: StyleProp<ImageStyle> }) {
  const dark = useIsDark();
  return <Image source={dark ? LOGO_DARK : LOGO} style={style} resizeMode="contain" accessibilityLabel="e-Supadom" />;
}
