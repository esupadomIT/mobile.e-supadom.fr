import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YellowButton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { roleLabel } from '@/lib/format';
import { useFullUser, useMe } from '@/lib/home';
import { radius, shadow, useColors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CONTACT_PHONE = '+33187667787';
const CONTACT_EMAIL = 'contact@e-supadom.fr';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const c = useColors();
  const { data: me } = useMe();
  const { data: full } = useFullUser();
  const person = me ?? user;
  if (!person) return null;

  const isInstructor = person.role === 'INSTRUCTOR';
  const isStudent = person.role === 'STUDENT' || person.role === 'USER';
  const classes = (me?.userClasses ?? []).map((uc) => uc.classe.nom).filter(Boolean).join(', ');
  const matieres = [...new Set((full?.matieres ?? []).map((m) => m.matiere.nom))].join(', ');
  const hours = typeof me?.totalHours === 'number' ? me.totalHours : null;

  const confirmSignOut = () =>
    Alert.alert('Se déconnecter ?', 'Tu ne recevras plus les notifications sur ce téléphone.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <ScreenHeader title="Mon profil" subtitle={roleLabel(person.role)} />

        <View style={styles.body}>
          <View style={[styles.card, shadow, styles.identity, { backgroundColor: c.surface }]}>
            <Avatar person={{ id: person.id, firstName: person.firstName, lastName: person.lastName, role: person.role, profilePicture: person.profilePicture }} size={76} />
            <Text style={[styles.name, { color: c.text }]}>
              {person.firstName} {person.lastName}
            </Text>
            <View style={styles.badges}>
              <View style={[styles.badge, { backgroundColor: c.primarySoft }]}>
                <Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }}>{roleLabel(person.role)}</Text>
              </View>
              {me?.reference ? (
                <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
                  <Text style={{ color: c.onAccent, fontWeight: '700', fontSize: 12 }}>Réf. {me.reference}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {isStudent ? (
            <View style={[styles.card, shadow, styles.balance, { backgroundColor: c.primary }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>Mon solde</Text>
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>
                  {hours !== null ? `${hours.toFixed(1).replace('.', ',').replace(',0', '')} h` : '—'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>de cours disponibles</Text>
              </View>
              <YellowButton title="Recharger" small onPress={() => router.push('/recharge')} />
            </View>
          ) : null}

          {isInstructor ? (
            <Group title="Mon enseignement">
              <InfoRow icon="school-outline" label="Classes" value={classes || 'Aucune classe'} multiline />
              <InfoRow icon="book-outline" label="Matières" value={matieres || 'Aucune matière'} multiline />
            </Group>
          ) : null}

          <Group title="Mes informations">
            <InfoRow icon="mail-outline" label="E-mail" value={person.email} />
            {me?.phone ? <InfoRow icon="call-outline" label="Téléphone" value={me.phone} /> : null}
            {me?.city ? <InfoRow icon="location-outline" label="Ville" value={me.city} /> : null}
            {isStudent && classes ? <InfoRow icon="school-outline" label="Classe" value={classes} /> : null}
            {isStudent && matieres ? <InfoRow icon="book-outline" label="Matières" value={matieres} multiline /> : null}
          </Group>

          <Group title="Compte">
            <LinkRow icon="create-outline" label="Modifier mon profil" onPress={() => router.push('/profil-modifier')} />
            <LinkRow
              icon="calendar-outline"
              label={isInstructor ? 'Mes disponibilités' : 'Mes disponibilités de la semaine'}
              onPress={() => router.push('/dispos')}
            />
            {isStudent ? <LinkRow icon="card-outline" label="Recharger mon compte" onPress={() => router.push('/recharge')} /> : null}
          </Group>

          <Group title="Aide">
            <LinkRow icon="call-outline" label="Appeler e-Supadom" onPress={() => Linking.openURL(`tel:${CONTACT_PHONE}`)} />
            <LinkRow icon="mail-outline" label="Écrire au support" onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />
          </Group>

          <Pressable
            onPress={confirmSignOut}
            style={({ pressed }) => [styles.logout, { backgroundColor: pressed ? c.dangerSoft : c.surface, borderColor: c.border }]}
          >
            <Ionicons name="log-out-outline" size={20} color={c.danger} />
            <Text style={{ color: c.danger, fontWeight: '700', fontSize: 16 }}>Se déconnecter</Text>
          </Pressable>

          <Text style={[styles.version, { color: c.subtle }]}>e-Supadom · version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.groupTitle, { color: c.muted }]}>{title}</Text>
      <View style={[styles.card, shadow, { backgroundColor: c.surface, paddingVertical: 4 }]}>{children}</View>
    </View>
  );
}

function InfoRow({ icon, label, value, multiline }: { icon: IconName; label: string; value: string; multiline?: boolean }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: c.primarySoft }]}>
        <Ionicons name={icon} size={18} color={c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.muted, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: c.text, fontSize: 15, fontWeight: '600', lineHeight: 20 }} numberOfLines={multiline ? 4 : 1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function LinkRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={[styles.iconBox, { backgroundColor: c.accentSoft }]}>
        <Ionicons name={icon} size={18} color={c.onAccent} />
      </View>
      <Text style={{ flex: 1, color: c.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={c.subtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 20, marginTop: -8 },
  card: { borderRadius: radius.lg, padding: 16 },
  identity: { alignItems: 'center', gap: 8 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 20, fontWeight: '800' },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  groupTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: radius.md, borderWidth: 1.5 },
  version: { textAlign: 'center', fontSize: 12 },
});
