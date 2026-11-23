import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card, PrimaryButton, SecondaryButton } from '@/components/ui';
import { LIST_POLL_MS } from '@/config';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { conversationWhen, fullName, messagePreview } from '@/lib/format';
import { activeChildren, useChildren, useChildrenConversations } from '@/lib/parent';
import { typography as t, useColors } from '@/theme';
import type { ChildConversation } from '@/types';

/**
 * Messages côté parent / tuteur (maquette « 📨 Parcours Messages Eleve / Prof / Parent ») :
 * historique des échanges entre ses enfants et leurs professeurs, en lecture seule.
 * Le parent n'écrit pas : pas de « Écrire à… » ni de champ de réponse.
 * `?enfant=<id>` : seulement les échanges de cet enfant (depuis « Le suivi de Clara »).
 */
export function ParentMessages() {
  const c = useColors();
  const { enfant } = useLocalSearchParams<{ enfant?: string }>();
  const only = Number(enfant) || null;

  const childrenQuery = useChildren();
  const children = useMemo(
    () => activeChildren(childrenQuery.data).filter((ch) => !only || ch.studentId === only),
    [childrenQuery.data, only],
  );
  const results = useChildrenConversations(children.map((ch) => ch.studentId), LIST_POLL_MS);
  const { refreshing, onRefresh } = useManualRefresh(() =>
    Promise.all([childrenQuery.refetch(), ...results.map((r) => r.refetch())]),
  );

  const loading = childrenQuery.isLoading || results.some((r) => r.isLoading);
  const failed = childrenQuery.isError || results.some((r) => r.isError);
  const sections = children.map((child, i) => ({ child, conversations: results[i]?.data?.conversations ?? [] }));
  const total = sections.reduce((n, s) => n + s.conversations.length, 0);
  const showNames = sections.length > 1;

  const open = (studentId: number, partnerId: number) =>
    router.push({ pathname: '/echange/[studentId]/[partnerId]', params: { studentId: String(studentId), partnerId: String(partnerId) } });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <Text style={[t.title, { color: c.text }]}>Messages</Text>
        <Text style={[t.body, { color: c.muted }]}>
          {only && children[0] ? `Les échanges de ${children[0].firstName} avec ses professeurs.` : 'Les échanges de vos enfants avec leurs professeurs.'}
        </Text>

        <Card tone="info">
          <Text style={[t.cardTitle, { color: c.text }]}>Lecture seule</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            Vous pouvez consulter l’historique des conversations, mais pas y répondre.
          </Text>
        </Card>

        {loading ? (
          <ActivityIndicator color={c.primary} style={styles.loader} />
        ) : failed ? (
          <>
            <Card>
              <Text style={[t.cardTitle, { color: c.text }]}>Connexion impossible</Text>
              <Text style={[t.cardText, { color: c.muted }]}>Vérifiez votre connexion, puis réessayez.</Text>
            </Card>
            <SecondaryButton title="Réessayer" onPress={onRefresh} />
          </>
        ) : children.length === 0 ? (
          <>
            <Card>
              <Text style={[t.cardTitle, { color: c.text }]}>Aucun enfant suivi</Text>
              <Text style={[t.cardText, { color: c.muted }]}>
                Ajoutez votre enfant depuis votre profil pour suivre ses échanges avec ses professeurs.
              </Text>
            </Card>
            <PrimaryButton title="Ajouter un enfant" onPress={() => router.push('/enfants/ajouter')} />
          </>
        ) : total === 0 ? (
          <Card>
            <Text style={[t.cardTitle, { color: c.text }]}>Aucun échange pour l’instant</Text>
            <Text style={[t.cardText, { color: c.muted }]}>
              Les messages entre {sections.length === 1 ? sections[0].child.firstName : 'vos enfants'} et{' '}
              {sections.length === 1 ? 'ses' : 'leurs'} professeurs apparaîtront ici.
            </Text>
          </Card>
        ) : (
          sections.map(({ child, conversations }) =>
            conversations.length === 0 && showNames ? null : (
              <View key={child.studentId} style={styles.section}>
                {showNames ? (
                  <Text style={[t.caption, { color: c.muted }]}>{`Échanges de ${child.firstName}`.toUpperCase()}</Text>
                ) : null}
                {conversations.map((conv) => (
                  <ExchangeCard
                    key={conv.partner.id}
                    conversation={conv}
                    childId={child.studentId}
                    childName={child.firstName}
                    onPress={() => open(child.studentId, conv.partner.id)}
                  />
                ))}
              </View>
            ),
          )
        )}

        {only ? <SecondaryButton title="Voir tous les échanges" onPress={() => router.setParams({ enfant: undefined })} /> : null}
      </ScrollView>
    </View>
  );
}

/** Carte « Dr. Marc Lambert · 16:42 » : dernier message, auteur, nombre de messages. */
function ExchangeCard({
  conversation,
  childId,
  childName,
  onPress,
}: {
  conversation: ChildConversation;
  childId: number;
  childName: string;
  onPress: () => void;
}) {
  const c = useColors();
  const { partner, lastMessage, totalMessages } = conversation;
  const author = lastMessage.senderId === childId ? childName : partner.firstName;
  return (
    <Card onPress={onPress} accessibilityLabel={`Échange entre ${childName} et ${fullName(partner)}`}>
      <Text style={[t.cardTitle, { color: c.text }]}>
        {fullName(partner)} · {conversationWhen(lastMessage.createdAt)}
      </Text>
      <Text style={[t.cardText, { color: c.muted }]} numberOfLines={2}>
        {author} : {messagePreview(lastMessage)}
      </Text>
      <Text style={[t.caption, { color: c.link }]}>
        PROFESSEUR · {totalMessages} MESSAGE{totalMessages > 1 ? 'S' : ''}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 24, paddingBottom: 40, gap: 16 },
  loader: { marginTop: 24 },
  section: { gap: 12 },
});
