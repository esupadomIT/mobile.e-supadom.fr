import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatTime } from '@/lib/format';
import { useColors } from '@/theme';
import type { Conversation, Message } from '@/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const c = useColors();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const conversation = queryClient
    .getQueryData<Conversation[]>(['conversations'])
    ?.find((conv) => conv.id === id);
  const title = conversation
    ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`
    : 'Conversation';

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.messages(id),
    enabled: !!id,
  });

  // Marque la conversation comme lue à l'ouverture et à chaque nouveau message.
  useEffect(() => {
    if (!id || !messages?.length) return;
    api
      .markRead(id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => undefined);
  }, [id, messages?.length, queryClient]);

  const send = useMutation({
    mutationFn: (content: string) => api.sendMessage(id, content),
    onSuccess: (message) => {
      queryClient.setQueryData<Message[]>(['messages', id], (old = []) =>
        old.some((m) => m.id === message.id) ? old : [...old, message],
      );
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const onSend = () => {
    const content = draft.trim();
    if (!content || send.isPending) return;
    setDraft('');
    send.mutate(content, { onError: () => setDraft(content) });
  };

  // FlatList inversée : le plus récent en bas, sans scroll manuel.
  const ordered = useMemo(() => [...(messages ?? [])].reverse(), [messages]);

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <ActivityIndicator style={styles.flex} />
        ) : (
          <FlatList
            inverted
            data={ordered}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <Bubble message={item} mine={item.senderId === user?.id} />}
          />
        )}

        {send.isError && (
          <Text style={[styles.sendError, { color: c.danger }]}>Message non envoyé. Réessaie.</Text>
        )}

        <View style={[styles.composer, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <TextInput
            style={[styles.input, { color: c.text, backgroundColor: c.bg }]}
            placeholder="Écrire un message…"
            placeholderTextColor={c.muted}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={onSend}
            disabled={!draft.trim() || send.isPending}
            style={[styles.sendBtn, { backgroundColor: c.primary, opacity: draft.trim() ? 1 : 0.4 }]}
          >
            <Text style={{ color: c.onPrimary, fontWeight: '700' }}>Envoyer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message, mine }: { message: Message; mine: boolean }) {
  const c = useColors();
  return (
    <View
      style={[
        styles.bubble,
        mine
          ? { alignSelf: 'flex-end', backgroundColor: c.primary, borderBottomRightRadius: 4 }
          : { alignSelf: 'flex-start', backgroundColor: c.bubbleOther, borderBottomLeftRadius: 4 },
      ]}
    >
      <Text style={{ color: mine ? c.onPrimary : c.text, fontSize: 15 }}>{message.content}</Text>
      <Text style={[styles.meta, { color: mine ? 'rgba(255,255,255,0.75)' : c.muted }]}>
        {formatTime(message.createdAt)}
        {mine ? (message.readAt ? ' · Lu' : ' · Envoyé') : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 12, gap: 6 },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  meta: { fontSize: 11, marginTop: 2, alignSelf: 'flex-end' },
  sendError: { textAlign: 'center', fontSize: 13, paddingBottom: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  sendBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
});
