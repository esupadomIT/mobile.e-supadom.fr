import { Alert, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Card, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { MY_PARENTS_KEY, relationLabel, useAnswerParentInvite, useMyParents } from '@/lib/parent';
import { typography as t, useColors } from '@/theme';

/** Profil élève : parents / tuteurs qui suivent le compte, et demandes de suivi à accepter. */
export function MyParents() {
  const c = useColors();
  const qc = useQueryClient();
  const { data } = useMyParents();
  const answer = useAnswerParentInvite();
  const parents = data ?? [];
  if (parents.length === 0) return null; // rien à afficher tant qu'aucun parent ne s'est manifesté

  const removeAccess = (linkId: number, name: string) =>
    Alert.alert(`Retirer l’accès de ${name} ?`, 'Cette personne ne verra plus votre planning, vos bilans ni vos paiements.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.removeMyParent(linkId);
          } finally {
            void qc.invalidateQueries({ queryKey: MY_PARENTS_KEY });
          }
        },
      },
    ]);

  return (
    <Card>
      <Text style={[t.cardTitle, { color: c.text }]}>Mes parents / tuteurs</Text>
      {parents.map((p) =>
        p.status === 'PENDING' ? (
          <View key={p.linkId} style={{ gap: 8 }}>
            <Text style={[t.cardText, { color: c.text }]}>
              {p.parent.name} ({relationLabel(p.relation).toLowerCase()}) souhaite suivre votre compte : planning, bilans et paiements.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Accepter" loading={answer.isPending} onPress={() => answer.mutate({ linkId: p.linkId, accept: true })} />
              </View>
              <View style={{ flex: 1 }}>
                <SecondaryButton title="Refuser" disabled={answer.isPending} onPress={() => answer.mutate({ linkId: p.linkId, accept: false })} />
              </View>
            </View>
          </View>
        ) : (
          <View key={p.linkId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[t.cardText, { color: c.muted, flex: 1 }]}>
              {p.parent.name} · {relationLabel(p.relation)}
            </Text>
            <Text accessibilityRole="button" onPress={() => removeAccess(p.linkId, p.parent.name)} style={[t.caption, { color: c.link }]}>
              Retirer
            </Text>
          </View>
        ),
      )}
      {answer.error ? <Notice kind="error">{answer.error.message}</Notice> : null}
    </Card>
  );
}
