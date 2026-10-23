import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { CHAT_KEY, useAppendMessage, useChat } from '@/lib/chat';
import { fileUrl, formatTime, fullName, messageText } from '@/lib/format';
import { useColors } from '@/theme';
import type { Message } from '@/types';

const MAX_LENGTH = 5000;

export default function ChatScreen() {
  const { partnerId: partnerParam } = useLocalSearchParams<{ partnerId: string }>();
  const partnerId = Number(partnerParam);
  const { user } = useAuth();
  const c = useColors();
  const queryClient = useQueryClient();
  const appendMessage = useAppendMessage();
  const [draft, setDraft] = useState('');

  const { data, isLoading } = useChat(CHAT_POLL_MS);
  const conversation = data?.conversations.find((conv) => conv.partner.id === partnerId);
  const partner =
    conversation?.partner ?? [...(data?.instructors ?? []), ...(data?.students ?? [])].find((p) => p.id === partnerId);
  const messages = conversation?.messages ?? []; // du plus récent au plus ancien

  // Marque la conversation comme lue dès qu'il y a des messages non lus.
  const unread = conversation?.unreadCount ?? 0;
  const conversationId = conversation?.id;
  useEffect(() => {
    if (!conversationId || unread === 0) return;
    api
      .markAsRead(conversationId)
      .then(() => queryClient.invalidateQueries({ queryKey: CHAT_KEY }))
      .catch(() => undefined);
  }, [conversationId, unread, queryClient]);

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

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ title: partner ? fullName(partner) : 'Conversation' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <ActivityIndicator style={styles.flex} />
        ) : (
          <FlatList
            inverted // le plus récent en bas, sans scroll manuel
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: c.muted }]}>
                {partner ? `Écris ton premier message à ${partner.firstName}.` : 'Aucun message.'}
              </Text>
            }
            renderItem={({ item }) => <Bubble message={item} mine={item.senderId === user?.id} />}
          />
        )}

        {send.isError && (
          <Text style={[styles.sendError, { color: c.danger }]}>
            {send.error instanceof Error ? send.error.message : 'Message non envoyé. Réessaie.'}
          </Text>
        )}

        <View style={[styles.composer, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <TextInput
            style={[styles.input, { color: c.text, backgroundColor: c.bg }]}
            placeholder="Écrire un message…"
            placeholderTextColor={c.muted}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={MAX_LENGTH}
            editable={!!partner}
          />
          <Pressable
            onPress={onSend}
            disabled={!draft.trim() || send.isPending || !partner}
            style={[styles.sendBtn, { backgroundColor: c.primary, opacity: draft.trim() && !send.isPending ? 1 : 0.4 }]}
          >
            {send.isPending ? (
              <ActivityIndicator color={c.onPrimary} />
            ) : (
              <Text style={{ color: c.onPrimary, fontWeight: '700' }}>Envoyer</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message, mine }: { message: Message; mine: boolean }) {
  const c = useColors();
  const text = messageText(message);
  const fg = mine ? c.onPrimary : c.text;

  return (
    <View
      style={[
        styles.bubble,
        mine
          ? { alignSelf: 'flex-end', backgroundColor: c.primary, borderBottomRightRadius: 4 }
          : { alignSelf: 'flex-start', backgroundColor: c.bubbleOther, borderBottomLeftRadius: 4 },
      ]}
    >
      {!!text && <Text style={{ color: fg, fontSize: 15 }}>{text}</Text>}
      {message.attachments?.map((a) => (
        <Pressable key={a.id} onPress={() => Linking.openURL(fileUrl(a.fileUrl))} hitSlop={4}>
          <Text style={{ color: fg, fontSize: 14, textDecorationLine: 'underline' }} numberOfLines={1}>
            📎 {a.fileName || 'Pièce jointe'}
          </Text>
        </Pressable>
      ))}
      <Text style={[styles.meta, { color: mine ? 'rgba(255,255,255,0.75)' : c.muted }]}>
        {formatTime(message.createdAt)}
        {mine ? (message.isRead ? ' · Lu' : ' · Envoyé') : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 12, gap: 6, flexGrow: 1 },
  empty: { textAlign: 'center', padding: 24, transform: [{ scaleY: -1 }] }, // la liste est inversée
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  meta: { fontSize: 11, alignSelf: 'flex-end' },
  sendError: { textAlign: 'center', fontSize: 13, paddingBottom: 4, paddingHorizontal: 16 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  sendBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, minWidth: 88, alignItems: 'center' },
});
