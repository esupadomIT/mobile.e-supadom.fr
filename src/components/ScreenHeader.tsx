import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/theme';

/** Bandeau bleu du site (en-tête des onglets), avec zone sûre en haut. */
export function ScreenHeader({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children?: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { backgroundColor: c.primary, paddingTop: insets.top + 12 }]}>
      <View style={styles.row}>
        <View style={styles.texts}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>
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
  wrap: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  texts: { flex: 1, gap: 2 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
});
