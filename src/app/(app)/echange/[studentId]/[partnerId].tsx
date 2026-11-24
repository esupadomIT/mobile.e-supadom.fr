import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatHeader } from '@/components/Messaging';
import { chatRows, MessageCard } from '@/components/ChatMessage';
import { Card, SecondaryButton } from '@/components/ui';
import { CHAT_POLL_MS } from '@/config';
import { dayLabel, formatTime } from '@/lib/format';
import { activeChildren, useChildMessages, useChildren } from '@/lib/parent';
import { typography as t, useColors } from '@/theme';

/**
 * Maquette Figma « 📨 Parcours Messages Eleve / Prof / Parent » → « Échange parent–professeur ».
 * Le parent consulte l'historique entre son enfant et un professeur : lecture seule
 * (pas de champ de réponse, rien n'est marqué comme lu pour l'enfant).
 */

const PAGE = 50;
const MAX_PAGE = 200;

export default function ChildExchangeScreen() {
  const params = useLocalSearchParams<{ studentId: string; partnerId: string }>();
  const studentId = Number(params.studentId) || 0;
  const partnerId = Number(params.partnerId) || 0;
  const c = useColors();
  const [limit, setLimit] = useState(PAGE);

  const { data: links } = useChildren();
  const child = activeChildren(links).find((l) => l.studentId === studentId);
  const childName = child?.firstName ?? 'votre enfant';

  const { data: page, isLoading, isError, refetch } = useChildMessages(studentId, partnerId, limit, CHAT_POLL_MS);
  const messages = useMemo(() => page?.messages ?? [], [page]);
  const rows = useMemo(() => chatRows(messages), [messages]);
  const partner = page?.partner;

  const loadOlder = () => {
    if (page?.hasMore && limit < MAX_PAGE) setLimit((l) => Math.min(MAX_PAGE, l + PAGE));
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ChatHeader partner={partner} subtitle={'Échanges avec ' + childName + ' · Lecture seule'} />
      {isLoading ? (
        <ActivityIndicator style={styles.flex} color={c.primary} />
      ) : isError ? (
        <View style={styles.padded}>
          <Card>
            <Text style={[t.cardTitle, { color: c.text }]}>Échange indisponible</Text>
            <Text style={[t.cardText, { color: c.muted }]}>Vérifiez votre connexion, puis réessayez.</Text>
          </Card>
          <SecondaryButton title="Réessayer" onPress={() => void refetch()} />
        </View>
      ) : (
        <FlatList
          inverted
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={styles.list}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            page?.hasMore && limit < MAX_PAGE ? (
              <SecondaryButton title="Messages précédents" onPress={loadOlder} />
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.flipped}>
              <Card tone="info">
                <Text style={[t.cardTitle, { color: c.text }]}>Aucun message</Text>
                <Text style={[t.cardText, { color: c.muted }]}>
                  Les messages entre {childName} et ce professeur apparaîtront ici.
                </Text>
              </Card>
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === 'day') {
              return (
                <Text style={[t.caption, styles.day, { color: c.muted }]}>
                  {`${dayLabel(item.date)} · ${formatTime(item.date)}`.toUpperCase()}
                </Text>
              );
            }
            const fromChild = item.message.senderId === studentId;
            const name = fromChild
              ? `${child?.firstName ?? 'Élève'} · Élève`
              : `${partner?.firstName ?? 'Professeur'} · Professeur`;
            return <MessageCard message={item.message} mine={fromChild} name={item.showName ? name : null} />;
          }}
        />
      )}

      {/* À la place de « Votre réponse » : le parent ne peut pas écrire. */}
      <View style={styles.footer}>
        <Card tone="info" accessibilityLabel="Lecture seule">
          <Text style={[t.cardTitle, { color: c.text }]}>Lecture seule</Text>
          <Text style={[t.cardText, { color: c.muted }]}>Les échanges restent associés au dossier de {childName}.</Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: 24, gap: 16 },
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, flexGrow: 1 },
  flipped: { transform: [{ scaleY: -1 }] },
  titleBlock: { gap: 16, paddingTop: 24, paddingBottom: 16 },
  day: { marginVertical: 16, textAlign: 'center', fontSize: 10 },
  footer: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
});
