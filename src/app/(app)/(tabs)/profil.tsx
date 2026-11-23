import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { MyParents } from '@/components/MyParents';
import { ParentChildren } from '@/components/ParentChildren';
import { AddChildSheet, IdentityCard, ProfileTitle, SectionTitle, ServiceRow, SignOutLink } from '@/components/ProfileParts';
import { Card, PrimaryButton, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useFullUser, useMe } from '@/lib/home';
import { hoursLabel } from '@/lib/parent';
import { fonts, typography as t, useColors } from '@/theme';

/**
 * Maquettes Figma « Profil (Élève & Parent) » (espace parent, espace élève) et
 * « Profil (Élève & Parent - Professeur) » (profil professeur), clair et sombre.
 * Parent : pas de solde (le solde appartient à chaque élève).
 */


export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const c = useColors();
  const { data: me } = useMe();
  const { data: full } = useFullUser();
  const [addChild, setAddChild] = useState(false);
  const person = me ?? user;
  if (!person) return null;

  const isInstructor = person.role === 'INSTRUCTOR';
  const isParent = person.role === 'PARENT';
  const isStudent = person.role === 'STUDENT' || person.role === 'USER';
  const classes = (me?.userClasses ?? []).map((uc) => uc.classe.nom).filter(Boolean).join(', ');
  const matieres = [...new Set((full?.matieres ?? []).map((m) => m.matiere.nom))].join(' · ');
  const hours = typeof me?.totalHours === 'number' ? me.totalHours : null;
  const contactLine = [me?.phone, me?.city].filter(Boolean).join(' · ');

  const confirmSignOut = () =>
    Alert.alert('Se déconnecter ?', 'Vous ne recevrez plus les notifications sur ce téléphone.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => void signOut() },
    ]);

  const openHelp = () => router.push('/aide-contact');
  const version = `e-Supadom v${Constants.expoConfig?.version ?? '1.0.0'}`;
  const helpLink = (
    <Pressable accessibilityRole="button" onPress={openHelp} hitSlop={8} style={{ alignSelf: 'center' }}>
      <Text style={[t.caption, styles.link, { color: c.link }]}>Aide & contact</Text>
    </Pressable>
  );

  // ─── Espace parent ─────────────────────────────────────────────────────
  if (isParent) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <AppHeader showBack={false} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          <ProfileTitle title="Profil" eyebrow="ESPACE PARENT" />
          <IdentityCard person={person} role="Parent / Tuteur" onEdit={() => router.push('/profil-modifier')} />
          <ParentChildren />
          <SectionTitle title="Services" subtitle="Le suivi de votre enfant, simplement." />
          <View style={{ gap: 10 }}>
            <ServiceRow title="Trouver un prof" hint="1er cours offert pour votre enfant" onPress={() => setAddChild(true)} />
            <ServiceRow title="Paramètres" hint="Notifications, apparence, confidentialité" onPress={() => router.push('/reglages')} />
            <ServiceRow title="Réglages & sécurité" hint="Mot de passe et sécurité du compte" onPress={() => router.push('/securite')} />
          </View>
          {helpLink}
          <SignOutLink label="Se déconnecter de l’espace parent" onPress={confirmSignOut} />
          <Text style={[t.captionRegular, { color: c.subtle, textAlign: 'center' }]}>{version}</Text>
        </ScrollView>
        <AddChildSheet visible={addChild} onClose={() => setAddChild(false)} />
      </View>
    );
  }

  // ─── Espace élève ──────────────────────────────────────────────────────
  if (isStudent) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <AppHeader showBack={false} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          <ProfileTitle title="Profil" eyebrow="ESPACE ÉLÈVE" />
          <IdentityCard person={person} role={classes ? `Élève · ${classes}` : 'Élève'} onEdit={() => router.push('/profil-modifier')} />
          <MyParents />
          <SectionTitle title="Mon solde prépayé" />
          <Card>
            <View style={styles.balanceRow}>
              <Text style={[styles.balance, { color: c.text }]}>{hours !== null ? hoursLabel(hours) : '—'}</Text>
              <Text style={[t.cardText, { color: c.muted, flex: 1 }]}>de cours disponibles</Text>
            </View>
            <SecondaryButton
              title="Recharger mon compte"
              icon={<Ionicons name="add-circle-outline" size={16} color={c.link} />}
              onPress={() => router.push('/recharge')}
            />
          </Card>
          <SectionTitle title="Services" />
          <View style={{ gap: 10 }}>
            <ServiceRow title="Trouver un prof" hint="1er cours offert avec nos enseignants" onPress={() => router.push('/trouver-prof')} />
            <ServiceRow title="Mes règlements" hint="Historique, solde et relevé PDF" onPress={() => router.push('/paiements')} />
            <ServiceRow title="Mes disponibilités" hint="Vos créneaux de la semaine" onPress={() => router.push('/dispos')} />
            <ServiceRow title="Paramètres" hint="Notifications, apparence, confidentialité, réglages & sécurité" onPress={() => router.push('/reglages')} />
          </View>
          {helpLink}
          <SignOutLink label="Se déconnecter de l’espace élève" onPress={confirmSignOut} />
          <Text style={[t.captionRegular, { color: c.subtle, textAlign: 'center' }]}>{version}</Text>
        </ScrollView>
      </View>
    );
  }

  // ─── Profil professeur (maquette inchangée) ────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader showBack={false} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={{ gap: 4 }}>
          <Text style={[t.title, { color: c.text }]}>Profil professeur</Text>
          <Text style={[t.body, { color: c.muted }]}>Votre espace personnel, simplement.</Text>
        </View>

        {/* Identité */}
        <Card tone="info">
          <Text style={[t.cardTitle, { color: c.text }]}>
            {person.firstName} {person.lastName}
          </Text>
          {matieres ? (
            <Text style={[t.cardText, { color: c.muted }]} numberOfLines={2}>
              {matieres}
            </Text>
          ) : null}
          <Ionicons name="person-outline" size={18} color={c.primary} style={{ marginTop: 4 }} />
          <Text style={[t.captionRegular, { color: c.link }]}>
            {me?.reference ? `Réf. ${me.reference} · ` : ''}
            {isInstructor ? 'Professeur' : 'Compte'}
          </Text>
        </Card>

        {/* Enseignement */}
        <Card>
          <Text style={[t.cardTitle, { color: c.text }]}>Mon enseignement</Text>
          <Text style={[t.cardText, { color: c.muted }]}>{classes || 'Aucune classe renseignée'}</Text>
          <Text style={[t.cardText, { color: c.muted }]}>{matieres || 'Aucune matière renseignée'}</Text>
        </Card>

        {/* Coordonnées */}
        <Card>
          <Text style={[t.cardTitle, { color: c.text }]}>Mes coordonnées</Text>
          <Text style={[t.cardText, { color: c.muted }]}>{person.email}</Text>
          {contactLine ? <Text style={[t.cardText, { color: c.muted }]}>{contactLine}</Text> : null}
        </Card>

        <View style={{ gap: 12, marginTop: 4 }}>
          <PrimaryButton title="Modifier mes informations" onPress={() => router.push('/profil-modifier')} />
          <SecondaryButton title="Mes disponibilités" onPress={() => router.push('/dispos')} />
        </View>

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
