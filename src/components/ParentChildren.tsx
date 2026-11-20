import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton } from '@/components/ui';
import { hoursLabel, relationLabel, seanceLine, useChildren } from '@/lib/parent';
import { radius, typography as t, useColors } from '@/theme';
import type { ChildLink } from '@/types';

/** Profil parent (maquette « Profil parent ») : enfants suivis, invitations en attente, ajout. */
export function ParentChildren() {
  const c = useColors();
  const { data, isLoading, error } = useChildren();
  const links = data ?? [];

  return (
    <Card>
      <Text style={[t.cardTitle, { color: c.text }]}>Mes enfants</Text>
      {isLoading ? <ActivityIndicator color={c.primary} /> : null}
      {error ? <Text style={[t.cardText, { color: c.danger }]}>{error.message}</Text> : null}
      {!isLoading && !error && links.length === 0 ? (
        <Text style={[t.cardText, { color: c.muted }]}>Ajoutez votre premier enfant pour suivre ses cours.</Text>
      ) : null}
      <View style={{ gap: 10 }}>
        {links.map((l) => (
          <ChildRow key={l.linkId} link={l} />
        ))}
      </View>
      <View style={{ marginTop: 6 }}>
        <PrimaryButton title="Ajouter un enfant" onPress={() => router.push('/enfants/ajouter')} />
      </View>
    </Card>
  );
}

function ChildRow({ link }: { link: ChildLink }) {
  const c = useColors();
  if (link.status === 'PENDING') {
    return (
      <View style={[styles.row, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
        <Ionicons name="hourglass-outline" size={20} color={c.muted} />
        <View style={{ flex: 1 }}>
          <Text style={[t.cardText, { color: c.text }]}>Invitation {link.inviteExpired ? 'expirée' : 'en attente'}</Text>
          <Text style={[t.captionRegular, { color: c.muted }]}>{link.invitedEmail}</Text>
        </View>
      </View>
    );
  }
  const sub = link.nextSeance ? `Prochaine séance : ${seanceLine(link.nextSeance)}` : 'Suivi scolaire et planning';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Suivi de ${link.firstName}`}
      onPress={() => router.push({ pathname: '/enfants/[id]', params: { id: String(link.studentId) } })}
      style={({ pressed }) => [styles.row, { borderColor: c.border, backgroundColor: pressed ? c.surfaceAlt : c.surface }]}
    >
      <Ionicons name="person-circle-outline" size={28} color={c.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.cardText, { color: c.text, fontWeight: '600' }]}>
          {link.firstName}
          {link.classe ? ` · ${link.classe.nom}` : ''} · {hoursLabel(link.totalHours)}
        </Text>
        <Text style={[t.captionRegular, { color: c.muted }]} numberOfLines={2}>
          {sub}
        </Text>
        <Text style={[t.captionRegular, { color: c.link }]}>Vous : {relationLabel(link.relation)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.subtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.md, padding: 12 },
});
