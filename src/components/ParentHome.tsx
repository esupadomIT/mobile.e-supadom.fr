import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ParentChildren } from '@/components/ParentChildren';
import { AddChildSheet } from '@/components/ProfileParts';
import { PrimaryButton } from '@/components/ui';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { useAuth } from '@/lib/auth';
import { useChildren } from '@/lib/parent';
import { fonts, radius, typography as t, useColors } from '@/theme';

/**
 * Accueil parent : salutation, carte Figma « Trouver un professeur pour votre enfant »
 * (le parcours commence par l'ajout de l'enfant) et enfants suivis.
 */
export function ParentHome() {
  const c = useColors();
  const { user } = useAuth();
  const children = useChildren();
  const { refreshing, onRefresh } = useManualRefresh(() => children.refetch());
  const [addChild, setAddChild] = useState(false);

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
          <Text style={[t.body, { color: c.muted }]}>Votre journée de cours, en un coup d’œil.</Text>
        </View>
        <View style={[styles.promo, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.pill, { backgroundColor: c.yellow }]}>
            <Ionicons name="gift-outline" size={13} color={c.onYellow} />
            <Text style={[styles.pillText, { color: c.onYellow }]}>1er cours 100% offert et sans engagement</Text>
          </View>
          <Text style={[t.cardTitle, { color: c.text, fontSize: 18 }]}>Trouver un professeur pour votre enfant</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            Besoin d’aide dans une nouvelle matière ? 1er cours découverte offert avec nos enseignants certifiés.
          </Text>
          <PrimaryButton title="Lancer ma recherche" icon="people-outline" onPress={() => setAddChild(true)} />
        </View>
        <ParentChildren />
      </ScrollView>
      <AddChildSheet visible={addChild} onClose={() => setAddChild(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
  promo: { borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: fonts.semibold, fontSize: 11 },
});
