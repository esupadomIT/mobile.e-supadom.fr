import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { fullName, roleLabel } from '@/lib/format';
import { fonts, useColors } from '@/theme';
import type { Partner } from '@/types';

export function ChatHeader({ partner, subtitle }: { partner?: Partner; subtitle?: string }) {
  const c = useColors();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: c.bg }}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour aux messages"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/messagerie'))}
          style={s.back}
        >
          <Ionicons name="arrow-back" size={21} color={c.link} />
        </Pressable>
        {partner ? <Avatar person={partner} size={36} /> : null}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[s.name, { color: c.text }]}>{partner ? fullName(partner) : 'Conversation'}</Text>
          <Text style={[s.small, { color: c.muted }]}>
            {subtitle ?? (partner ? roleLabel(partner.role) : 'Messages')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
export function InboxFilters({
  search,
  onSearch,
  filter,
  onFilter,
  unread,
  files = true,
}: {
  search: string;
  onSearch: (v: string) => void;
  filter: string;
  onFilter: (v: string) => void;
  unread?: number;
  files?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 10 }}>
      <Text style={[s.small, { color: c.text }]}>Rechercher</Text>
      <View style={[s.search, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Ionicons name="search-outline" size={16} color={c.muted} />
        <TextInput
          accessibilityLabel="Rechercher un correspondant ou un message"
          value={search}
          onChangeText={onSearch}
          placeholder="Prénom, nom ou message"
          placeholderTextColor={c.subtle}
          style={[s.input, { color: c.text }]}
        />
      </View>
      <View style={s.filters}>
        {[
          ['all', 'Tous'],
          ...(unread === undefined ? [] : [['unread', 'Non lus (' + unread + ')']]),
          ...(files ? [['files', 'Fichiers récents']] : []),
        ].map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === key }}
            onPress={() => onFilter(key)}
            style={[s.chip, { backgroundColor: filter === key ? c.primary : c.surface }]}
          >
            <Text style={[s.small, { color: filter === key ? c.onPrimary : c.muted }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function InboxRow({
  partner,
  preview,
  date,
  unread = 0,
  child,
  onPress,
}: {
  partner: Partner;
  preview: string;
  date?: string;
  unread?: number;
  child?: string;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'Conversation avec ' + fullName(partner)}
      onPress={onPress}
      style={({ pressed }) => [s.card, { backgroundColor: pressed ? c.surfaceAlt : c.surface }]}
    >
      <Avatar person={partner} size={38} />
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <View style={s.line}>
          <Text style={[s.name, { color: c.text, flex: 1 }]}>{fullName(partner)}</Text>
          {date ? <Text style={[s.small, { color: unread ? c.link : c.muted }]}>{date}</Text> : null}
          {unread ? <View style={[s.dot, { backgroundColor: c.primary }]} /> : null}
        </View>
        <Text style={[s.small, { color: c.link }]}>
          {roleLabel(partner.role)}
          {child ? ' · ' + child : ''}
        </Text>
        <Text numberOfLines={2} style={[s.preview, { color: c.text }]}>
          {preview}
        </Text>
        {child ? <Text style={[s.small, { color: c.muted }]}>Consulter l’échange · Lecture seule</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={c.link} />
    </Pressable>
  );
}
export function InboxEmpty({ filtered = false }: { filtered?: boolean }) {
  const c = useColors();
  return (
    <View style={[s.empty, { backgroundColor: c.surface }]}>
      <Ionicons name="chatbubble-outline" size={36} color={c.link} />
      <Text style={[s.name, { color: c.text, textAlign: 'center' }]}>
        {filtered ? 'Aucun résultat' : 'Aucun message pour le moment'}
      </Text>
      <Text style={[s.preview, { color: c.muted, textAlign: 'center' }]}>
        {filtered ? 'Essayez un autre filtre ou une autre recherche.' : 'Vos échanges apparaîtront ici.'}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  back: { width: 36, height: 44, justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 19 },
  small: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 15 },
  preview: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  input: { flex: 1, minWidth: 0, minHeight: 42, fontFamily: fonts.regular, fontSize: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 38, paddingHorizontal: 12, borderRadius: 24, justifyContent: 'center' },
  card: { flexDirection: 'row', gap: 9, padding: 12, borderRadius: 12, alignItems: 'flex-start' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  empty: { minHeight: 320, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
});
