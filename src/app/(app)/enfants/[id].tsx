import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AccountScreen } from '@/components/AccountScreen';
import { Card, Notice, SecondaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { CHILDREN_KEY, childKey, hoursLabel, relationLabel, seanceLine, useChildOverview } from '@/lib/parent';
import { fonts, typography as t, useColors } from '@/theme';

/** Maquette Figma « Le suivi de Clara » (Profil · Espace parent · Vue d’ensemble). */
export default function ChildScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = Number(id) || null;
  const { data, isLoading, error, refetch } = useChildOverview(studentId);

  const rights = useMutation({
    mutationFn: (body: { isPayer?: boolean; canBook?: boolean }) => api.updateChild(studentId!, body),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: childKey(studentId ?? 0) });
      void qc.invalidateQueries({ queryKey: CHILDREN_KEY });
    },
  });

  const remove = () =>
    Alert.alert(
      `Retirer ${data?.child.firstName ?? 'cet enfant'} ?`,
      'Vous ne verrez plus son planning ni ses bilans. L’historique des paiements est conservé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeChild(studentId!);
              await qc.invalidateQueries({ queryKey: CHILDREN_KEY });
              router.back();
            } catch (e) {
              Alert.alert('Action impossible', e instanceof Error ? e.message : 'Merci de réessayer.');
            }
          },
        },
      ],
    );

  if (isLoading || !studentId) {
    return (
      <AccountScreen title="Suivi" subtitle="Espace parent · Vue d’ensemble">
        <ActivityIndicator color={c.primary} />
      </AccountScreen>
    );
  }
  if (error || !data) {
    return (
      <AccountScreen title="Suivi" subtitle="Espace parent · Vue d’ensemble">
        <Notice kind="error">{error instanceof Error ? error.message : 'Ce suivi n’est pas disponible.'}</Notice>
        <SecondaryButton title="Réessayer" onPress={() => void refetch()} />
      </AccountScreen>
    );
  }

  const { child } = data;
  const next = data.upcoming[0];
  const referent = data.teachers[0];

  return (
    <AccountScreen title={`Le suivi de ${child.firstName}`} subtitle="Espace parent · Vue d’ensemble">
      <Card tone="info">
        <Text style={[t.cardTitle, { color: c.text }]}>
          {child.firstName} {child.lastName}
          {child.classe ? ` · ${child.classe.nom}` : ''}
        </Text>
        <Text style={[t.cardText, { color: c.muted }]}>
          {referent ? `Professeur référent : ${referent.name}` : 'Pas encore de professeur attitré'}
        </Text>
        <Text style={[t.captionRegular, { color: c.link }]}>Vous : {relationLabel(data.relation)}</Text>
        {child.managedByParent ? (
          <SecondaryButton
            title={`Modifier le profil ${child.firstName}`}
            onPress={() => router.push({ pathname: '/enfants/modifier/[id]', params: { id: String(studentId) } })}
          />
        ) : null}
      </Card>

      <Card>
        <Text style={[t.cardTitle, { color: c.text }]}>Prochaine séance</Text>
        {next ? (
          <>
            <Text style={[t.cardText, { color: c.text }]}>{seanceLine(next)}</Text>
            {next.instructor ? <Text style={[t.cardText, { color: c.muted }]}>Avec {next.instructor.name}</Text> : null}
          </>
        ) : (
          <Text style={[t.cardText, { color: c.muted }]}>Aucune séance planifiée.</Text>
        )}
      </Card>

      <SecondaryButton
        title={`Voir les échanges de ${child.firstName}`}
        onPress={() => router.push({ pathname: '/messages', params: { enfant: String(studentId) } })}
      />

      <Card>
        <Text style={[t.cardTitle, { color: c.text }]}>Solde d’heures</Text>
        <Text style={[styles.big, { color: c.text }]}>{hoursLabel(child.totalHours)} restantes</Text>
        {data.soldesParMatiere.map((m) => (
          <View key={m.matiereNom} style={styles.row}>
            <Text style={[t.cardText, { color: c.muted, flex: 1 }]}>{m.matiereNom}</Text>
            <Text style={[t.cardText, { color: c.text }]}>{hoursLabel(m.heures)}</Text>
          </View>
        ))}
        <Text style={[t.captionRegular, { color: c.subtle }]}>{data.pastSeancesCount} séance(s) déjà suivie(s)</Text>
      </Card>

      {data.upcoming.length > 1 ? (
        <Card>
          <Text style={[t.cardTitle, { color: c.text }]}>Séances à venir</Text>
          {data.upcoming.slice(1).map((s) => (
            <Text key={s.id} style={[t.cardText, { color: c.muted }]}>
              {seanceLine(s)}
              {s.instructor ? ` · ${s.instructor.name}` : ''}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={[t.cardTitle, { color: c.text }]}>Vos droits</Text>
        <RightRow
          label="Je paie ses cours"
          hint="Recharges et factures à votre nom"
          value={data.isPayer}
          disabled={rights.isPending}
          onChange={(v) => rights.mutate({ isPayer: v })}
        />
        <RightRow
          label="Je réserve ses cours"
          hint="Réserver ou annuler une séance pour lui / elle"
          value={data.canBook}
          disabled={rights.isPending}
          onChange={(v) => rights.mutate({ canBook: v })}
        />
        {rights.error ? <Notice kind="error">{rights.error.message}</Notice> : null}
      </Card>

      <Text style={[t.captionRegular, { color: c.subtle, textAlign: 'center' }]}>
        Les informations scolaires sont partagées avec le responsable légal rattaché au compte.
      </Text>

      <Pressable accessibilityRole="button" onPress={remove} hitSlop={8} style={{ alignSelf: 'center' }}>
        <Text style={[t.caption, { color: c.danger }]}>Retirer cet enfant de mon compte</Text>
      </Pressable>
    </AccountScreen>
  );
}

function RightRow({ label, hint, value, onChange, disabled }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <View style={styles.right}>
      <View style={{ flex: 1 }}>
        <Text style={[t.cardText, { color: c.text, fontFamily: fonts.semibold }]}>{label}</Text>
        <Text style={[t.captionRegular, { color: c.muted }]}>{hint}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: c.primary, false: c.border }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
});
