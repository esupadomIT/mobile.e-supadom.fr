import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { MyParents } from '@/components/MyParents';
import { ParentChildren } from '@/components/ParentChildren';
import { Card, PrimaryButton, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useFullUser, useMe } from '@/lib/home';
import { activeChildren, useChildren } from '@/lib/parent';
import { fonts, typography as t, useColors } from '@/theme';

/** Maquette Figma « 🎭 Profil » : Profil élève / parent / professeur (clair et sombre). */


export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const c = useColors();
  const { data: me } = useMe();
  const { data: full } = useFullUser();
  const children = useChildren((me ?? user)?.role === 'PARENT');
  const person = me ?? user;
  if (!person) return null;

  const isInstructor = person.role === 'INSTRUCTOR';
  const isParent = person.role === 'PARENT';
  const isStudent = person.role === 'STUDENT' || person.role === 'USER';
  const classes = (me?.userClasses ?? []).map((uc) => uc.classe.nom).filter(Boolean).join(', ');
  const matieres = [...new Set((full?.matieres ?? []).map((m) => m.matiere.nom))].join(' · ');
  const hours = typeof me?.totalHours === 'number' ? me.totalHours : null;
  const contactLine = [me?.phone, me?.city].filter(Boolean).join(' · ');
  // « Responsable de Clara · 1 enfant accompagné » (maquette Profil parent)
  const kids = activeChildren(children.data);
  const parentLine = kids.length
    ? `Responsable de ${kids.map((k) => k.firstName).join(', ')} · ${kids.length} enfant${kids.length > 1 ? 's' : ''} accompagné${kids.length > 1 ? 's' : ''}`
    : 'Aucun enfant rattaché pour l’instant';

  const confirmSignOut = () =>
    Alert.alert('Se déconnecter ?', 'Vous ne recevrez plus les notifications sur ce téléphone.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => void signOut() },
    ]);

  const openHelp = () => router.push('/aide-contact');

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader showBack={false} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={{ gap: 4 }}>
          <Text style={[t.title, { color: c.text }]}>{isInstructor ? 'Profil professeur' : isParent ? 'Profil parent' : 'Profil élève'}</Text>
          <Text style={[t.body, { color: c.muted }]}>Votre espace personnel, simplement.</Text>
        </View>

        {/* Identité */}
        <Card tone="info">
          <Text style={[t.cardTitle, { color: c.text }]}>
            {person.firstName} {person.lastName}
          </Text>
          {isParent ? (
            <Text style={[t.cardText, { color: c.muted }]} numberOfLines={2}>
              {parentLine}
            </Text>
          ) : (isInstructor ? matieres : classes) ? (
            <Text style={[t.cardText, { color: c.muted }]} numberOfLines={2}>
              {isInstructor ? matieres : classes}
            </Text>
          ) : null}
          <Ionicons name="person-outline" size={18} color={c.primary} style={{ marginTop: 4 }} />
          <Text style={[t.captionRegular, { color: c.link }]}>
            {me?.reference ? `Réf. ${me.reference} · ` : ''}
            {isInstructor ? 'Professeur' : isParent ? 'Parent / Tuteur' : 'Élève'}
          </Text>
        </Card>

        {/* Solde (élève) */}
        {isStudent ? (
          <Card onPress={() => router.push('/recharge')} accessibilityLabel="Recharger mon compte">
            <Text style={[t.cardTitle, { color: c.text }]}>Mon solde d’heures</Text>
            <View style={styles.balanceRow}>
              <Text style={[styles.balance, { color: c.text }]}>
                {hours !== null ? `${hours.toFixed(1).replace('.', ',').replace(',0', '')} h` : '—'}
              </Text>
              <Text style={[t.cardText, { color: c.muted, flex: 1 }]}>de cours disponibles</Text>
              <Text style={[t.caption, { color: c.link }]}>Recharger</Text>
              <Ionicons name="arrow-forward" size={15} color={c.link} />
            </View>
          </Card>
        ) : null}

        {/* Enfants suivis (parent) */}
        {isParent ? <ParentChildren /> : null}

        {/* Parents / tuteurs qui suivent le compte (élève) */}
        {isStudent ? <MyParents /> : null}

        {/* Enseignement (prof) */}
        {isInstructor ? (
          <Card>
            <Text style={[t.cardTitle, { color: c.text }]}>Mon enseignement</Text>
            <Text style={[t.cardText, { color: c.muted }]}>{classes || 'Aucune classe renseignée'}</Text>
            <Text style={[t.cardText, { color: c.muted }]}>{matieres || 'Aucune matière renseignée'}</Text>
          </Card>
        ) : null}

        {/* Coordonnées */}
        <Card>
          <Text style={[t.cardTitle, { color: c.text }]}>Mes coordonnées</Text>
          <Text style={[t.cardText, { color: c.muted }]} >
            {person.email}
          </Text>
          {contactLine ? <Text style={[t.cardText, { color: c.muted }]}>{contactLine}</Text> : null}
        </Card>

        <View style={{ gap: 12, marginTop: 4 }}>
          <PrimaryButton title="Modifier mes informations" onPress={() => router.push('/profil-modifier')} />
          {isParent ? null : (
            <SecondaryButton
              title={isInstructor ? 'Mes disponibilités' : 'Mes disponibilités de la semaine'}
              onPress={() => router.push('/dispos')}
            />
          )}
        </View>

        {isStudent ? <SecondaryButton title="Mes paiements" onPress={() => router.push('/paiements')} /> : null}
        <SecondaryButton title="Réglages & sécurité" onPress={() => router.push('/reglages')} />
        <View style={styles.links}>
          <Pressable accessibilityRole="button" onPress={openHelp} hitSlop={8}>
            <Text style={[t.caption, styles.link, { color: c.link }]}>Aide & contact</Text>
          </Pressable>
          <Text style={[t.captionRegular, { color: c.subtle }]}>·</Text>
          <Pressable accessibilityRole="button" onPress={confirmSignOut} hitSlop={8}>
            <Text style={[t.caption, styles.link, { color: c.link }]}>Se déconnecter</Text>
          </Pressable>
        </View>

        <Text style={[t.captionRegular, { color: c.subtle, textAlign: 'center' }]}>
          e-Supadom · version {Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balance: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30 },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  link: { fontSize: 13 },
});
