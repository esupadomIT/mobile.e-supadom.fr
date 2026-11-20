import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ParentChildren } from '@/components/ParentChildren';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { useAuth } from '@/lib/auth';
import { useChildren } from '@/lib/parent';
import { typography as t, useColors } from '@/theme';

/** Accueil parent (parcours P4, première version) : salutation + enfants suivis avec leur prochaine séance. */
export function ParentHome() {
  const c = useColors();
  const { user } = useAuth();
  const children = useChildren();
  const { refreshing, onRefresh } = useManualRefresh(() => children.refetch());

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader showBack={false} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <View style={{ gap: 4 }}>
          <Text style={[t.title, { color: c.text }]} numberOfLines={1}>
            Bonjour {user?.firstName ?? ''}
          </Text>
          <Text style={[t.body, { color: c.muted }]}>Le suivi de vos enfants, en un coup d’œil.</Text>
        </View>
        <ParentChildren />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
});
