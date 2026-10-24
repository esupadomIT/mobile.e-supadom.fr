import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { radius, useColors } from '@/theme';

/** Champ de formulaire avec libellé, bordure colorée au focus et action à droite (ex. « Afficher »). */
export type TextInputRef = ComponentRef<typeof TextInput>;

export function Field({
  label,
  right,
  style,
  onFocus,
  onBlur,
  ref,
  ...props
}: Omit<TextInputProps, 'ref'> & { label: string; right?: ReactNode; ref?: Ref<TextInputRef> }) {
    const c = useColors();
    const [focused, setFocused] = useState(false);
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
        <View
          style={[
            styles.inputBox,
            { backgroundColor: c.surface, borderColor: focused ? c.primary : c.border },
          ]}
        >
          <TextInput
            ref={ref}
            placeholderTextColor={c.subtle}
            style={[styles.input, { color: c.text }, style]}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />
          {right}
        </View>
      </View>
    );
}

export function PrimaryButton({ title, onPress, loading, disabled }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  const c = useColors();
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? c.primaryPressed : c.primary, opacity: off && !loading ? 0.5 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={c.onPrimary} /> : <Text style={[styles.buttonText, { color: c.onPrimary }]}>{title}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, icon, loading, disabled }: { title: string; onPress: () => void; icon?: ReactNode; loading?: boolean; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles.secondary,
        { backgroundColor: pressed ? c.surfaceAlt : c.surface, borderColor: c.border, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.text} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, { color: c.text }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Divider({ label }: { label: string }) {
  const c = useColors();
  return (
    <View style={styles.divider}>
      <View style={[styles.line, { backgroundColor: c.border }]} />
      <Text style={{ color: c.subtle, fontSize: 13 }}>{label}</Text>
      <View style={[styles.line, { backgroundColor: c.border }]} />
    </View>
  );
}

/** Message d'erreur ou de succès dans un encadré. */
export function Notice({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  const c = useColors();
  const error = kind === 'error';
  return (
    <View style={[styles.notice, { backgroundColor: error ? c.dangerSoft : c.primarySoft }]}>
      <Text style={{ color: error ? c.danger : c.primary, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16 },
  button: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  secondary: { borderWidth: 1.5 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  notice: { borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12 },
});
