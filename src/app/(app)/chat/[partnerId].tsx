import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHAT_POLL_MS } from '@/config';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CHAT_KEY, messagesKey, useAppendMessage, useChat, useMessages } from '@/lib/chat';
import { setActiveChatPartner } from '@/lib/push';
import { Avatar } from '@/components/Avatar';
import { dayLabel, fileUrl, formatTime, fullName, messageText, roleLabel } from '@/lib/format';
import { radius, useColors } from '@/theme';
import type { Message } from '@/types';

const MAX_LENGTH = 5000;
const PAGE = 50;
const MAX_PAGE = 200;

export default function ChatScreen() {
  const { partnerId: partnerParam } = useLocalSearchParams<{ partnerId: string }>();
  const partnerId = Number(partnerParam);
  const { user } = useAuth();
  const c = useColors();
  const queryClient = useQueryClient();
  const appendMessage = useAppendMessage();
  const [draft, setDraft] = useState('');
  const [limit, setLimit] = useState(PAGE);

  // Correspondant : liste des conversations (déjà en cache, pas de rafraîchissement ici)
  const { data } = useChat();
  const conversation = data?.conversations.find((conv) => conv.partner.id === partnerId);
  const partner =
    conversation?.partner ?? [...(data?.instructors ?? []), ...(data?.students ?? [])].find((p) => p.id === partnerId);

  // Messages : seulement cette discussion, `limit` derniers, rafraîchis toutes les 5 s
  const { data: page, isLoading } = useMessages(partnerId, limit, CHAT_POLL_MS);
  const messages = page?.messages ?? []; // du plus récent au plus ancien

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
    setDraft('');
    send.mutate(text, { onError: () => setDraft(text) });
  };

  // Lignes de la liste (inversée : index 0 = plus récent) : messages + séparateurs de jour.
  // Un message est « groupé » avec le suivant s'il a le même auteur à moins de 5 min.
  const rows = useMemo(() => {
    const out: Row[] = [];
    messages.forEach((m, i) => {
      const older = messages[i + 1];
      const newer = messages[i - 1];
      const sameDayAsOlder = older && new Date(older.createdAt).toDateString() === new Date(m.createdAt).toDateString();
      const near = (a?: Message) =>
        !!a && a.senderId === m.senderId && Math.abs(+new Date(a.createdAt) - +new Date(m.createdAt)) < 5 * 60_000;
      out.push({ kind: 'message', key: `m${m.id}`, message: m, groupedWithOlder: !!sameDayAsOlder && near(older), groupedWithNewer: near(newer) });
      if (!sameDayAsOlder) out.push({ kind: 'day', key: `d${m.id}`, label: dayLabel(m.createdAt) });
    });
    return out;
  }, [messages]);

  const canSend = !!draft.trim() && !send.isPending && !!partner;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: c.bg }]}>
      <Stack.Screen
        options={{
          headerTitle: () =>
            partner ? (
              <View style={styles.headerTitle}>
                <Avatar person={partner} size={32} />
                <View>
                  <Text style={[styles.headerName, { color: c.text }]} numberOfLines={1}>
                    {fullName(partner)}
                  </Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>{roleLabel(partner.role)}</Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.headerName, { color: c.text }]}>Conversation</Text>
            ),
          headerBackTitle: 'Messages',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.surface },
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <ActivityIndicator style={styles.flex} color={c.primary} />
        ) : (
          <FlatList
            inverted // le plus récent en bas, sans scroll manuel
            data={rows}
            keyExtractor={(r) => r.key}
            contentContainerStyle={styles.list}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              page?.hasMore && limit < MAX_PAGE ? <ActivityIndicator style={{ marginVertical: 12 }} color={c.subtle} /> : undefined
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                {partner && <Avatar person={partner} size={64} />}
                <Text style={[styles.emptyTitle, { color: c.text }]}>
                  {partner ? `Dis bonjour à ${partner.firstName} 👋` : 'Aucun message'}
                </Text>
                <Text style={{ color: c.muted, textAlign: 'center' }}>
                  Les numéros de téléphone et adresses e-mail sont masqués dans les messages.
                </Text>
              </View>
            }
            renderItem={({ item }) =>
              item.kind === 'day' ? (
                <View style={styles.day}>
                  <Text style={[styles.dayText, { color: c.muted, backgroundColor: c.surfaceAlt }]}>{item.label}</Text>
                </View>
              ) : (
                <Bubble
                  message={item.message}
                  mine={item.message.senderId === user?.id}
                  groupedWithOlder={item.groupedWithOlder}
                  groupedWithNewer={item.groupedWithNewer}
                />
              )
            }
          />
        )}

        {send.isError && (
          <Text style={[styles.sendError, { color: c.danger }]}>
            {send.error instanceof Error ? send.error.message : 'Message non envoyé. Réessaie.'}
          </Text>
        )}

        <View style={[styles.composer, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <TextInput
            style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt }]}
            placeholder="Écrire un message…"
            placeholderTextColor={c.subtle}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={MAX_LENGTH}
            editable={!!partner}
          />
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            accessibilityLabel="Envoyer"
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: canSend ? (pressed ? c.primaryPressed : c.primary) : c.border },
            ]}
          >
            {send.isPending ? (
              <ActivityIndicator color={c.onPrimary} size="small" />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: Message; groupedWithOlder: boolean; groupedWithNewer: boolean };

function Bubble({ message, mine, groupedWithOlder, groupedWithNewer }: { message: Message; mine: boolean; groupedWithOlder: boolean; groupedWithNewer: boolean }) {
  const c = useColors();
  const text = messageText(message);
  const fg = mine ? c.onPrimary : c.text;
  const big = radius.lg;
  const small = 6;

  return (
    <View
      style={[
        styles.bubble,
        { marginTop: groupedWithOlder ? 2 : 10 },
        mine
          ? {
              alignSelf: 'flex-end',
              backgroundColor: c.bubbleMine,
              borderTopRightRadius: groupedWithOlder ? small : big,
              borderBottomRightRadius: groupedWithNewer ? small : big,
            }
          : {
              alignSelf: 'flex-start',
              backgroundColor: c.bubbleOther,
              borderTopLeftRadius: groupedWithOlder ? small : big,
              borderBottomLeftRadius: groupedWithNewer ? small : big,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
            },
      ]}
    >
      {!!text && <Text style={{ color: fg, fontSize: 15.5, lineHeight: 21 }}>{text}</Text>}
      {message.attachments?.map((a) => (
        <Pressable
          key={a.id}
          onPress={() => Linking.openURL(fileUrl(a.fileUrl))}
          hitSlop={4}
          style={[styles.attachment, { backgroundColor: mine ? 'rgba(255,255,255,0.16)' : c.surfaceAlt }]}
        >
          <Text style={{ color: fg, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
            📎 {a.fileName || 'Pièce jointe'}
          </Text>
        </Pressable>
      ))}
      {!groupedWithNewer && (
        <Text style={[styles.meta, { color: mine ? 'rgba(255,255,255,0.78)' : c.subtle }]}>
          {formatTime(message.createdAt)}
          {mine ? (message.isRead ? '  ✓✓ Lu' : '  ✓ Envoyé') : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 240 },
  headerName: { fontSize: 16, fontWeight: '700' },
  list: { paddingHorizontal: 12, paddingVertical: 12, flexGrow: 1 },
  empty: { alignItems: 'center', gap: 10, padding: 32, transform: [{ scaleY: -1 }] }, // la liste est inversée
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  day: { alignItems: 'center', marginVertical: 12 },
  dayText: { fontSize: 12, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 9, gap: 6 },
  attachment: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  meta: { fontSize: 11, alignSelf: 'flex-end' },
  sendError: { textAlign: 'center', fontSize: 13, paddingBottom: 4, paddingHorizontal: 16 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 130, minHeight: 42, borderRadius: 21, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 16 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: -2 },
});
