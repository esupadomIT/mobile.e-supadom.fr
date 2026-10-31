import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/theme';
import { MessagesButton } from '@/components/MessagesButton';

/** Barre fixe, hors de la zone défilante, sur les écrans à contenu long. */
export function BrandHeader({ title }: { title: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fixed, { backgroundColor: c.surface, borderBottomColor: c.border, paddingTop: insets.top + 8 }]}>
      <View style={styles.logoBox}>
        <Image source={require('../../assets/logo-transparent.png')} style={styles.logo} resizeMode="contain" accessibilityLabel={`e-Supadom · ${title}`} />
      </View>
      <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'flex-end' }}><MessagesButton /></View>
    </View>
  );
}

/** En-tête commun avec signature de marque et zone sûre. */
export function ScreenHeader({ title, subtitle, right, children, embedded = false }: { title: string; subtitle?: string; right?: ReactNode; children?: ReactNode; embedded?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderBottomColor: c.border, paddingTop: embedded ? 20 : insets.top + 16 }]}>
      {!embedded ? <View style={styles.brand}>
        <View style={styles.logoBox}>
          <Image source={require('../../assets/logo-transparent.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="e-Supadom" />
        </View>
        <View style={[styles.brandLine, { backgroundColor: c.border }]} />
        <MessagesButton />
      </View> : null}
      <View style={styles.row}>
        <View style={styles.texts}>
          {subtitle ? <Text style={[styles.subtitle, { color: c.muted }]}>{subtitle}</Text> : null}
          <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fixed: { zIndex: 1, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  wrap: { paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: StyleSheet.hairlineWidth, gap: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: { height: 38, justifyContent: 'center', overflow: 'hidden' },
  logo: { width: 120, height: 60 },
  brandLine: { flex: 1, height: StyleSheet.hairlineWidth, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  texts: { flex: 1, gap: 5 },
  subtitle: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -1, lineHeight: 36 },
});
