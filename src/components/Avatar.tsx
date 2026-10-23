import { Image, StyleSheet, Text, View } from 'react-native';

import { fileUrl, initials } from '@/lib/format';
import { useColors } from '@/theme';
import type { Partner } from '@/types';

export function Avatar({ person, size = 48 }: { person: Partner; size?: number }) {
  const c = useColors();
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (person.profilePicture) {
    return <Image source={{ uri: fileUrl(person.profilePicture) }} style={box} />;
  }
  return (
    <View style={[styles.fallback, box, { backgroundColor: c.primary }]}>
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{initials(person)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700' },
});
