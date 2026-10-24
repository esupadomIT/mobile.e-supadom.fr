import { Image, StyleSheet, Text, View } from 'react-native';

import { fileUrl, initials } from '@/lib/format';
import { AVATAR_COLORS, useColors } from '@/theme';
import type { Partner } from '@/types';

export function Avatar({ person, size = 48, online }: { person: Partner; size?: number; online?: boolean }) {
  const c = useColors();
  const box = { width: size, height: size, borderRadius: size / 2 };
  const color = AVATAR_COLORS[Math.abs(person.id ?? 0) % AVATAR_COLORS.length];

  return (
    <View style={box}>
      {person.profilePicture ? (
        <Image source={{ uri: fileUrl(person.profilePicture) }} style={[box, { backgroundColor: c.surfaceAlt }]} />
      ) : (
        <View style={[styles.fallback, box, { backgroundColor: color }]}>
          <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials(person)}</Text>
        </View>
      )}
      {online && <View style={[styles.dot, { borderColor: c.surface, backgroundColor: c.accent }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700', letterSpacing: 0.3 },
  dot: { position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
