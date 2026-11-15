import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { typography as t, useColors } from '@/theme';

/** Même signature de marque que les profils et la messagerie Figma. */
export function BrandHeader({ title }: { title: string }) {
  return <View accessibilityLabel={title}><AppHeader showBack={false} /></View>;
}

export function ScreenHeader({ title, subtitle, right, children, embedded = false }: { title: string; subtitle?: string; right?: ReactNode; children?: ReactNode; embedded?: boolean }) {
  const c = useColors();
  return <View style={{ backgroundColor: c.bg }}>
    {!embedded ? <AppHeader showBack={false} /> : null}
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text accessibilityRole="header" style={[t.title, { color: c.text }]}>{title}</Text>
          {subtitle ? <Text style={[t.body, { color: c.muted }]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  texts: { flex: 1, minWidth: 180, gap: 6 },
});
