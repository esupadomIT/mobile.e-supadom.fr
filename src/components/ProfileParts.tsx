import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { PrimaryButton } from '@/components/ui';
import { fonts, radius, typography as t, useColors } from '@/theme';
import type { Partner } from '@/types';

/**
 * Éléments communs des maquettes Figma « Profil (Élève & Parent) » :
 * en-tête d'identité, titres de section, lignes « Services », fenêtre « Ajouter un enfant ».
 */

/** « Profil » + « ESPACE PARENT » / « ESPACE ÉLÈVE ». */
export function ProfileTitle({ title, eyebrow }: { title: string; eyebrow: string }) {
  const c = useColors();
  return (
    <View>
      <Text style={[t.title, { color: c.text }]}>{title}</Text>
      <Text style={[styles.eyebrow, { color: c.primary }]}>{eyebrow}</Text>
    </View>
  );
}

/** Carte d'identité : photo, nom, rôle, bouton « Modifier ». */
export function IdentityCard({ person, role, onEdit }: { person: Partner; role: string; onEdit?: () => void }) {
  const c = useColors();
  return (
    <View style={[styles.card, styles.identity, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Avatar person={person} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.cardTitle, { color: c.text }]} numberOfLines={1}>
          {person.firstName} {person.lastName ? `${person.lastName[0]}.` : ''}
        </Text>
        <Text style={[t.captionRegular, { color: c.muted }]}>{role}</Text>
      </View>
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Modifier mes informations"
          onPress={onEdit}
          style={({ pressed }) => [styles.edit, { borderColor: c.primary, backgroundColor: pressed ? c.primarySoft : 'transparent' }]}
        >
          <Ionicons name="pencil" size={13} color={c.primary} />
          <Text style={[t.caption, { color: c.primary }]}>Modifier</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Titre de section (« Mes enfants », « Services »…) avec pastille et sous-titre facultatifs. */
export function SectionTitle({ title, badge, subtitle }: { title: string; badge?: string; subtitle?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 2 }}>
      <View style={styles.inline}>
        <Text style={[styles.section, { color: c.text }]}>{title}</Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
            <Text style={[styles.badgeText, { color: c.onAccent }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {subtitle ? <Text style={[t.captionRegular, { color: c.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

/** Ligne de la carte « Services ». */
export function ServiceRow({ title, hint, onPress }: { title: string; hint: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, styles.service, { backgroundColor: pressed ? c.surfaceAlt : c.surface, borderColor: c.border }]}
    >
      <Ionicons name="chevron-forward" size={16} color={c.text} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.cardText, { color: c.text, fontFamily: fonts.semibold }]}>{title}</Text>
        <Text style={[t.captionRegular, { color: c.muted }]}>{hint}</Text>
      </View>
    </Pressable>
  );
}

/** « Se déconnecter de l'espace parent » (lien rouge). */
export function SignOutLink({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={[styles.inline, { alignSelf: 'center' }]}>
      <Ionicons name="log-out-outline" size={16} color={c.danger} />
      <Text style={[t.caption, { color: c.danger }]}>{label}</Text>
    </Pressable>
  );
}

/** Carte en pointillés « Ajouter un enfant · Suivi personnalisé ». */
export function AddTile({ onPress, children }: { onPress: () => void; children?: ReactNode }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ajouter un enfant"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, styles.add, { borderColor: c.primary, backgroundColor: pressed ? c.primarySoft : c.surface }]}
    >
      <Ionicons name="add" size={20} color={c.primary} />
      <Text style={[t.caption, { color: c.text }]}>Ajouter un enfant</Text>
      <Text style={[t.captionRegular, { color: c.muted }]}>Suivi personnalisé</Text>
      {children}
    </Pressable>
  );
}

/**
 * Fenêtre Figma « Ajouter un enfant · Étape rapide ~1 minute » : point d'entrée du parcours
 * « Trouver un prof » côté parent (l'enfant reçoit ensuite son lien d'activation).
 */
export function AddChildSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer">
        <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => undefined}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={18} color={c.muted} />
          </Pressable>
          <View style={[styles.sheetIcon, { backgroundColor: c.primarySoft }]}>
            <Ionicons name="person-add-outline" size={22} color={c.primary} />
          </View>
          <View style={[styles.badge, { backgroundColor: c.primarySoft, alignSelf: 'center' }]}>
            <Text style={[styles.badgeText, { color: c.link }]}>Étape rapide · ~1 minute</Text>
          </View>
          <Text style={[t.cardTitle, { color: c.text, textAlign: 'center', fontSize: 18 }]}>Ajouter un enfant</Text>
          <Text style={[t.cardText, { color: c.muted, textAlign: 'center' }]}>
            Vous allez inscrire un nouvel élève sous votre responsabilité parentale. Vous pourrez configurer son niveau et ses matières ensuite.
          </Text>
          <PrimaryButton
            title="Ok j’avance"
            onPress={() => {
              onClose();
              router.push('/enfants/ajouter');
            }}
          />
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={{ alignSelf: 'center' }}>
            <Text style={[t.caption, { color: c.muted }]}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6 },
  card: { borderWidth: 1, borderRadius: radius.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11 },
  service: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  tile: { flexBasis: '47%', flexGrow: 1, minHeight: 110, borderRadius: radius.md, padding: 12, gap: 4 },
  add: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(10, 20, 35, 0.45)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: radius.lg, padding: 22, gap: 12 },
  close: { position: 'absolute', right: 14, top: 14, zIndex: 1 },
  sheetIcon: { alignSelf: 'center', width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
