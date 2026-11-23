import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { MessageCard } from '@/components/ChatMessage';
import { Card, PrimaryButton, SecondaryButton } from '@/components/ui';
import { CHAT_POLL_MS } from '@/config';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CHAT_KEY, messagesKey, useAppendMessage, useChat, useMessages } from '@/lib/chat';
import { dayLabel, formatTime, fullName } from '@/lib/format';
import { setActiveChatPartner } from '@/lib/push';
import { fonts, typography as t, useColors } from '@/theme';
import type { Message, Role } from '@/types';

/** Maquette Figma « 📨 Parcours Messages » → écran « Marc Lambert · Clair / Sombre » (53:24408). */

const MAX_LENGTH = 5000;
const PAGE = 50;
const MAX_PAGE = 200;

const roleLong = (role: Role) => (role === 'INSTRUCTOR' ? 'Professeur' : role === 'STUDENT' ? 'Élève' : 'Équipe e-Supadom');

export default function ChatScreen() {
  const { partnerId: partnerParam } = useLocalSearchParams<{ partnerId: string }>();
  const partnerId = Number(partnerParam);
  const { user } = useAuth();
  const c = useColors();
  const queryClient = useQueryClient();
  const appendMessage = useAppendMessage();
  const [draft, setDraft] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [focused, setFocused] = useState(false);

  // Correspondant : liste des conversations (déjà en cache, pas de rafraîchissement ici)
  const { data } = useChat();
  const conversation = data?.conversations.find((conv) => conv.partner.id === partnerId);
  const partner =
    conversation?.partner ?? [...(data?.instructors ?? []), ...(data?.students ?? [])].find((p) => p.id === partnerId);

  // Messages : seulement cette discussion, `limit` derniers, rafraîchis toutes les 5 s
  const { data: page, isLoading, isError, refetch } = useMessages(partnerId, limit, CHAT_POLL_MS);
  const messages = useMemo(() => page?.messages ?? [], [page]); // du plus récent au plus ancien

  // Marque la discussion comme lue dès qu'il y a des messages non lus.
  const unread = page?.unreadCount ?? 0;
  const conversationId = page?.conversationIds[0];
  useEffect(() => {
    if (!conversationId || unread === 0) return;
    api
      .markAsRead(conversationId)
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: messagesKey(partnerId) }),
          queryClient.invalidateQueries({ queryKey: CHAT_KEY }),
        ]),
      )
      .catch(() => undefined);
  }, [conversationId, unread, partnerId, queryClient]);

  // Pas de bannière push pour la discussion affichée
  useEffect(() => {
    setActiveChatPartner(partnerId);
    return () => setActiveChatPartner(null);
  }, [partnerId]);

  // Historique plus ancien en remontant (liste inversée : « fin » = haut de l'écran)
  const loadOlder = () => {
    if (page?.hasMore && limit < MAX_PAGE) setLimit((l) => Math.min(MAX_PAGE, l + PAGE));
  };

  const send = useMutation({
    mutationFn: (text: string) => api.sendMessage(partnerId, text),
    onSuccess: (message) => appendMessage(message, partnerId),
  });

  const onSend = () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    send.mutate(text, { onSuccess: () => setDraft('') });
  };

  // Lignes (liste inversée : index 0 = plus récent) : messages, statut de lecture,
  // séparateurs « AUJOURD'HUI · 16:42 ». Un message suit le précédent (même carte de
  // nom omise) s'il a le même auteur à moins de 5 min.
  const rows = useMemo(() => {
    const out: Row[] = [];
    const lastMine = messages.find((m) => m.senderId === user?.id);
    messages.forEach((m, i) => {
      const older = messages[i + 1];
      if (m === lastMine && i === 0) out.push({ kind: 'status', key: `s${m.id}`, message: m });
      const sameDayAsOlder = older && new Date(older.createdAt).toDateString() === new Date(m.createdAt).toDateString();
      const followsOlder =
        !!sameDayAsOlder && older.senderId === m.senderId && +new Date(m.createdAt) - +new Date(older.createdAt) < 5 * 60_000;
      out.push({ kind: 'message', key: `m${m.id}`, message: m, showName: !followsOlder });
      if (!sameDayAsOlder) {
        out.push({ kind: 'day', key: `d${m.id}`, label: `${dayLabel(m.createdAt)} · ${formatTime(m.createdAt)}`.toUpperCase() });
      }
    });
    return out;
  }, [messages, user?.id]);

  const canSend = !!draft.trim() && !send.isPending && !!partner;

  // Titre de l'écran : en haut de l'historique (pied de la liste inversée)
  const title = (
    <View style={styles.titleBlock}>
      <Text style={[t.title, { color: c.text }]} numberOfLines={2}>
        {partner ? fullName(partner) : 'Conversation'}
      </Text>
      {partner ? <Text style={[t.body, { color: c.muted }]}>{roleLong(partner.role)}</Text> : null}
      {page?.hasMore && limit < MAX_PAGE ? <ActivityIndicator color={c.subtle} /> : null}
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/messages'))} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isLoading ? (
          <ActivityIndicator style={styles.flex} color={c.primary} />
        ) : isError ? (
          <View style={styles.error}>
            <Card>
              <Text style={[t.cardTitle, { color: c.text }]}>Conversation indisponible</Text>
              <Text style={[t.cardText, { color: c.muted }]}>Vérifiez votre connexion, puis réessayez. Votre brouillon est conservé.</Text>
            </Card>
            <SecondaryButton title="Réessayer" onPress={() => void refetch()} />
          </View>
        ) : (
          <FlatList
            inverted // le plus récent en bas, sans scroll manuel
            data={rows}
            keyExtractor={(r) => r.key}
            contentContainerStyle={styles.list}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            ListFooterComponent={title}
            ListEmptyComponent={
              <View style={styles.flipped}>
                <Card tone="info">
                  <Text style={[t.cardTitle, { color: c.text }]}>
                    {partner ? `Écrivez à ${partner.firstName}` : 'Aucun message'}
                  </Text>
                  <Text style={[t.cardText, { color: c.muted }]}>
                    Les numéros de téléphone et adresses e-mail sont masqués dans les messages.
                  </Text>
                </Card>
              </View>
            }
            renderItem={({ item }) => {
              if (item.kind === 'day') {
                return <Text style={[t.caption, styles.row, { color: c.muted }]}>{item.label}</Text>;
              }
              if (item.kind === 'status') {
                return (
                  <Text style={[t.captionRegular, styles.status, { color: c.muted }]}>
                    {item.message.isRead
                      ? 'Lu'
                      : `Envoyé à ${formatTime(item.message.createdAt)} · En attente de lecture`}
                  </Text>
                );
              }
              const mine = item.message.senderId === user?.id;
              const name = mine
                ? `${user?.firstName ?? 'Moi'} · Vous`
                : partner?.firstName ?? 'Correspondant';
              return <MessageCard message={item.message} mine={mine} name={item.showName ? name : null} />;
            }}
          />
        )}

        {/* Carte « Votre réponse » + « Envoyer le message » */}
        <View style={styles.composer}>
          {send.isError ? (
            <Text style={[t.cardText, { color: c.danger }]}>
              {send.error instanceof Error ? send.error.message : 'Message non envoyé. Réessayez.'}
            </Text>
          ) : null}
          <View style={[styles.replyCard, { backgroundColor: c.surface, borderColor: focused ? c.focus : c.border }]}>
            <Text style={[t.cardTitle, { color: c.text }]}>Votre réponse</Text>
            <TextInput
              style={[t.cardText, styles.input, { color: c.text }]}
              placeholder={partner ? `Écrire à ${partner.firstName}…` : 'Écrire un message…'}
              placeholderTextColor={c.subtle}
              value={draft}
              onChangeText={setDraft}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              multiline
              maxLength={MAX_LENGTH}
              editable={!!partner && !send.isPending}
              accessibilityLabel="Votre réponse"
            />
          </View>
          <PrimaryButton title="Envoyer le message" onPress={onSend} loading={send.isPending} disabled={!canSend} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'status'; key: string; message: Message }
  | { kind: 'message'; key: string; message: Message; showName: boolean };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 8, flexGrow: 1 },
  error: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 24, gap: 16, flex: 1 },
  flipped: { transform: [{ scaleY: -1 }] }, // la liste est inversée
  titleBlock: { gap: 16, paddingTop: 24, paddingBottom: 16 },
  row: { marginBottom: 16 },
  status: { marginTop: -8, marginBottom: 16 },
  composer: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 16 },
  replyCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 },
  input: { minHeight: 20, maxHeight: 120, padding: 0, fontFamily: fonts.regular, textAlignVertical: 'top' },
});
