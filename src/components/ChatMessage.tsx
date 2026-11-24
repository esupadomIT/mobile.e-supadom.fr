import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { fileUrl, formatTime, messageText } from '@/lib/format';
import { fonts, typography as t, useColors } from '@/theme';
import type { Attachment, Message } from '@/types';

/**
 * Carte de message du chat (maquette « 📨 Parcours Messages ») : blanche pour le
 * correspondant, surface/info pour « mes » messages. `name` = carte de nom
 * (« Marc · Professeur »), omise quand le message suit le précédent.
 */
export function MessageCard({ message, mine, name }: { message: Message; mine: boolean; name: string | null }) {
  const c = useColors();
  const text = messageText(message);
  return (
    <View style={[styles.group, { alignSelf: mine ? 'flex-end' : 'flex-start' }]}>
      {name ? (
        <Text style={[styles.meta, { color: c.muted, textAlign: mine ? 'right' : 'left' }]}>
          {name} · {formatTime(message.createdAt)}
        </Text>
      ) : null}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: mine ? c.surfaceAlt : c.surface,
            borderTopLeftRadius: mine ? 12 : 3,
            borderTopRightRadius: mine ? 3 : 12,
          },
        ]}
      >
        {text ? (
          <Text selectable style={[styles.message, { color: c.text }]}>
            {text}
          </Text>
        ) : null}
        {message.attachments?.map((a) => (
          <AttachmentCard key={a.id} attachment={a} />
        ))}
      </View>
      {mine ? (
        <Text style={[styles.receipt, { color: c.onAccent }]}>{message.isRead ? '✓✓ Lu' : '✓ Envoyé'}</Text>
      ) : null}
    </View>
  );
}

/** Carte « Annales Bac · Équations » / « PDF · 248 Ko » avec icône document. */
export function AttachmentCard({ attachment }: { attachment: Attachment }) {
  const c = useColors();
  const ext = (
    attachment.fileName?.split('.').pop() ||
    attachment.fileType.split('/').pop() ||
    'fichier'
  ).toUpperCase();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Ouvrir ${attachment.fileName || 'la pièce jointe'}`}
      onPress={() => Linking.openURL(fileUrl(attachment.fileUrl))}
      style={({ pressed }) => [
        styles.attachment,
        { backgroundColor: c.surfaceAlt, borderColor: pressed ? c.focus : c.border },
      ]}
    >
      <Text style={[t.cardTitle, { color: c.text }]} numberOfLines={2}>
        {attachment.fileName || 'Pièce jointe'}
      </Text>
      <Text style={[t.cardText, { color: c.muted }]}>{ext} · Toucher pour ouvrir</Text>
      <Ionicons name="document-text-outline" size={26} color={c.link} />
    </Pressable>
  );
}

/**
 * Lignes d'une liste inversée (index 0 = plus récent) : messages et séparateurs
 * « AUJOURD'HUI · 16:42 ». Un message suit le précédent (carte de nom omise)
 * s'il a le même auteur à moins de 5 min, le même jour.
 */
export type ChatRow =
  { kind: 'day'; key: string; date: string } | { kind: 'message'; key: string; message: Message; showName: boolean };

export function chatRows(messages: Message[]): ChatRow[] {
  const out: ChatRow[] = [];
  messages.forEach((m, i) => {
    const older = messages[i + 1];
    const sameDayAsOlder = !!older && new Date(older.createdAt).toDateString() === new Date(m.createdAt).toDateString();
    const followsOlder =
      sameDayAsOlder &&
      older.senderId === m.senderId &&
      +new Date(m.createdAt) - +new Date(older.createdAt) < 5 * 60_000;
    out.push({ kind: 'message', key: `m${m.id}`, message: m, showName: !followsOlder });
    if (!sameDayAsOlder) out.push({ kind: 'day', key: `d${m.id}`, date: m.createdAt });
  });
  return out;
}

const styles = StyleSheet.create({
  group: { gap: 5, marginBottom: 14, maxWidth: '88%', minWidth: 80 },
  bubble: { padding: 12, borderRadius: 12, gap: 8 },
  message: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19 },
  meta: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 15 },
  receipt: { fontFamily: fonts.medium, fontSize: 9, lineHeight: 14, textAlign: 'right' },
  attachment: { borderWidth: 1, borderRadius: 8, padding: 10, gap: 4 },
});
