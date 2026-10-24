import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState, type ReactNode } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addDaysIso, formatIsoDay, isoDay, monthLabel, weekdayOfIso } from '@/lib/tz';
import { radius, shadow, useColors } from '@/theme';

/** Carte blanche avec titre (sections de formulaire). */
export function Section({ title, subtitle, children, right }: { title?: string; subtitle?: string; children: ReactNode; right?: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.section, shadow, { backgroundColor: c.surface }]}>
      {title ? (
        <View style={styles.sectionHead}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
            {subtitle ? <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18 }}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Option à choix unique (bouton radio) ou multiple (case à cocher). */
export function Choice({
  label,
  description,
  selected,
  onPress,
  multiple,
  disabled,
  right,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  multiple?: boolean;
  disabled?: boolean;
  right?: ReactNode;
}) {
  const c = useColors();
  const icon = multiple ? (selected ? 'checkbox' : 'square-outline') : selected ? 'radio-button-on' : 'radio-button-off';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.choice,
        {
          borderColor: selected ? c.primary : c.border,
          backgroundColor: selected ? c.primarySoft : pressed ? c.surfaceAlt : c.surface,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={22} color={selected ? c.primary : c.subtle} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        {description ? <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18 }}>{description}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

/** Pastille sélectionnable (jours, durées…). */
export function Chip({ label, selected, onPress, tone = 'primary' }: { label: string; selected: boolean; onPress: () => void; tone?: 'primary' | 'warning' }) {
  const c = useColors();
  const on = tone === 'warning' ? '#C2410C' : c.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? on : pressed ? c.surfaceAlt : c.surface, borderColor: selected ? on : c.border },
      ]}
    >
      <Text style={{ color: selected ? '#fff' : c.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

function BottomSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.sheetHead}>
          <Text style={[styles.sectionTitle, { color: c.text, flex: 1 }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={c.muted} />
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

function FieldBox({ label, value, placeholder, onPress, icon }: { label: string; value?: string; placeholder?: string; onPress: () => void; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  const c = useColors();
  return (
    <View style={{ gap: 6, flex: 1 }}>
      {label ? <Text style={[styles.label, { color: c.muted }]}>{label}</Text> : null}
      <Pressable onPress={onPress} style={[styles.box, { borderColor: c.border, backgroundColor: c.surface }]}>
        <Text style={{ flex: 1, color: value ? c.text : c.subtle, fontSize: 16 }} numberOfLines={1}>
          {value || placeholder || 'Choisir'}
        </Text>
        <Ionicons name={icon} size={18} color={c.muted} />
      </Pressable>
    </View>
  );
}

/** Liste déroulante (feuille modale). */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: T | '' | null | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <FieldBox label={label} value={current?.label} placeholder={placeholder} onPress={() => setOpen(true)} icon="chevron-down" />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label || placeholder || 'Choisir'}>
        <FlatList
          data={options}
          keyExtractor={(o) => o.value}
          style={{ maxHeight: 420 }}
          initialScrollIndex={Math.max(0, options.findIndex((o) => o.value === value))}
          getItemLayout={(_, index) => ({ length: 50, offset: 50 * index, index })}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onChange(item.value);
                setOpen(false);
              }}
              style={({ pressed }) => [styles.option, { backgroundColor: pressed ? c.surfaceAlt : 'transparent' }]}
            >
              <Text style={{ flex: 1, color: c.text, fontSize: 16, fontWeight: item.value === value ? '700' : '400' }}>{item.label}</Text>
              {item.value === value ? <Ionicons name="checkmark" size={20} color={c.primary} /> : null}
            </Pressable>
          )}
        />
      </BottomSheet>
    </>
  );
}

/** Sélecteur de date (calendrier mensuel), au format « YYYY-MM-DD ». */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FieldBox label={label} value={value ? formatIsoDay(value, true) : undefined} placeholder={placeholder} onPress={() => setOpen(true)} icon="calendar-outline" />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label || 'Date'}>
        <MonthCalendar
          value={value}
          min={min}
          max={max}
          onPick={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      </BottomSheet>
    </>
  );
}

const WEEK_HEAD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function MonthCalendar({ value, min, max, onPick }: { value: string | null; min?: string; max?: string; onPick: (iso: string) => void }) {
  const c = useColors();
  const start = value || min || isoDay();
  const [ym, setYm] = useState(() => ({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) }));
  const cells = useMemo(() => {
    const first = `${ym.y}-${String(ym.m).padStart(2, '0')}-01`;
    const lead = (weekdayOfIso(first) + 6) % 7; // lundi en premier
    const days: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDaysIso(d, 1)) days.push(d);
    while (days.length % 7) days.push(null);
    return days;
  }, [ym]);
  const shift = (n: number) => setYm(({ y, m }) => ({ y: m + n > 12 ? y + 1 : m + n < 1 ? y - 1 : y, m: ((m + n + 11) % 12) + 1 }));
  const today = isoDay();
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.calHead}>
        <Pressable onPress={() => shift(-1)} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={c.primary} />
        </Pressable>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{monthLabel(ym.y, ym.m)}</Text>
        <Pressable onPress={() => shift(1)} hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={c.primary} />
        </Pressable>
      </View>
      <View style={styles.calGrid}>
        {WEEK_HEAD.map((d, i) => (
          <Text key={`h${i}`} style={[styles.calCell, { color: c.subtle, fontWeight: '700' }]}>
            {d}
          </Text>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <View key={`e${i}`} style={styles.calCell} />;
          const disabled = (min && iso < min) || (max && iso > max);
          const selected = iso === value;
          return (
            <Pressable key={iso} disabled={!!disabled} onPress={() => onPick(iso)} style={styles.calCell}>
              <View
                style={[
                  styles.calDay,
                  selected && { backgroundColor: c.primary },
                  !selected && iso === today && { borderWidth: 1.5, borderColor: c.primary },
                ]}
              >
                <Text style={{ color: selected ? '#fff' : disabled ? c.border : c.text, fontWeight: selected ? '800' : '500' }}>{Number(iso.slice(8))}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Étapes d'un parcours (pastilles numérotées défilantes). */
export function StepBar({ steps, current }: { steps: string[]; current: number }) {
  const c = useColors();
  return (
    <View style={styles.steps}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={s + i} style={styles.step}>
            <View style={[styles.stepDot, { backgroundColor: active ? c.yellow : done ? c.accent : 'rgba(255,255,255,0.25)' }]}>
              {done ? (
                <Ionicons name="checkmark" size={14} color={c.onAccent} />
              ) : (
                <Text style={{ color: active ? c.onYellow : '#fff', fontWeight: '800', fontSize: 12 }}>{i + 1}</Text>
              )}
            </View>
            {active ? (
              <Text style={styles.stepLabel} numberOfLines={1}>
                {s}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: radius.lg, padding: 16, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: radius.md, padding: 14 },
  chip: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, height: 50 },
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  option: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center', textAlign: 'center', textAlignVertical: 'center' },
  calDay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
