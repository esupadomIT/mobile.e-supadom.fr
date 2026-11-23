import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { AddTile, SectionTitle } from '@/components/ProfileParts';
import { activeChildren, useChildren } from '@/lib/parent';
import { radius, typography as t, useColors } from '@/theme';
import type { ChildLink } from '@/types';

/**
 * Maquette Figma « Profil (Élève & Parent) » : « Mes enfants · N enfant(s) inscrit(s) »,
 * cartes des enfants (et invitations en attente) + carte « Ajouter un enfant ».
 */
export function ParentChildren() {
  const c = useColors();
  const { data, isLoading, error } = useChildren();
  const links = data ?? [];
  const n = activeChildren(links).length;

  return (
    <View style={{ gap: 10 }}>
      <SectionTitle title="Mes enfants" badge={`${n} enfant${n > 1 ? 's' : ''} inscrit${n > 1 ? 's' : ''}`} />
      {isLoading ? <ActivityIndicator color={c.primary} /> : null}
      {error ? <Text style={[t.cardText, { color: c.danger }]}>{error.message}</Text> : null}
      <View style={[styles.grid, { backgroundColor: c.surface, borderColor: c.border }]}>
        {links.map((l) => (
          <ChildTile key={l.linkId} link={l} />
        ))}
        <AddTile onPress={() => router.push('/enfants/ajouter')} />
      </View>
    </View>
  );
}

function ChildTile({ link }: { link: ChildLink }) {
  const c = useColors();
  if (link.status === 'PENDING') {
    return (
      <View style={[styles.tile, { backgroundColor: c.surfaceAlt }]}>
        <Ionicons name="hourglass-outline" size={22} color={c.muted} />
        <Text style={[t.caption, { color: c.text }]}>Invitation {link.inviteExpired ? 'expirée' : 'en attente'}</Text>
        <Text style={[t.captionRegular, { color: c.muted }]} numberOfLines={1}>
          {link.invitedEmail}
        </Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Suivi de ${link.firstName}`}
      onPress={() => router.push({ pathname: '/enfants/[id]', params: { id: String(link.studentId) } })}
      style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? c.primarySoft : c.surfaceAlt }]}
    >
      <Avatar person={{ id: link.studentId, firstName: link.firstName, lastName: link.lastName, role: 'STUDENT', profilePicture: link.profilePicture }} size={34} />
      <Text style={[t.caption, { color: c.text }]} numberOfLines={1}>
        {link.firstName} {link.lastName ? `${link.lastName[0]}.` : ''}
      </Text>
      <Text style={[t.captionRegular, { color: c.muted }]} numberOfLines={1}>
        {link.classe?.niveau ?? link.classe?.nom ?? 'Élève'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderWidth: 1, borderRadius: radius.md, padding: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, minHeight: 110, borderRadius: radius.md, padding: 12, gap: 4 },
});
