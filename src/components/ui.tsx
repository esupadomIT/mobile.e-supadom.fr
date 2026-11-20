import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { fonts, radius, typography as t, useColors } from '@/theme';

/** Champ de formulaire avec libellé, bordure colorée au focus et action à droite (ex. « Afficher »). */
export type TextInputRef = ComponentRef<typeof TextInput>;

export function Field({
  label,
  right,
  style,
  onFocus,
  onBlur,
  ref,
  error,
  ...props
}: Omit<TextInputProps, 'ref'> & { label: string; right?: ReactNode; ref?: Ref<TextInputRef>; error?: string | null }) {
    const c = useColors();
    const [focused, setFocused] = useState(false);
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: c.text }]}>{label}</Text>
        <View
          style={[
            styles.inputBox,
            error
              ? { backgroundColor: c.dangerSoft, borderColor: c.danger }
              : { backgroundColor: focused ? c.surface : c.bg, borderColor: focused ? c.primary : c.border },
          ]}
        >
          <TextInput
            ref={ref}
            accessibilityLabel={label}
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
        {error ? <Text style={{ color: c.danger, fontSize: 12, lineHeight: 17 }}>{error}</Text> : null}
      </View>
    );
}

/**
 * Bouton principal. `icon` : pictogramme Ionicons avant le libellé (flèche « → Envoyer le lien » des maquettes).
 * `loadingTitle` : pendant le chargement, bouton grisé avec roue + libellé (« Envoi en cours… ») au lieu de la roue seule.
 */
export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  loadingTitle,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loadingTitle?: string;
}) {
  const c = useColors();
  const off = disabled || loading;
  if (loading && loadingTitle) {
    return (
      <View
        accessibilityRole="button"
        accessibilityLabel={loadingTitle}
        accessibilityState={{ disabled: true, busy: true }}
        style={[styles.button, styles.row, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
      >
        <ActivityIndicator color={c.muted} size="small" />
        <Text style={[styles.buttonText, { color: c.muted }]}>{loadingTitle}</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? c.primaryPressed : c.primary, borderColor: c.focus, opacity: off && !loading ? 0.5 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.onPrimary} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={18} color={c.onPrimary} /> : null}
          <Text style={[styles.buttonText, { color: c.onPrimary }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Bouton d'action jaune du site (« Nous découvrir ») : rejoindre une séance, etc. */
export function YellowButton({ title, onPress, small }: { title: string; onPress: () => void; small?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.small,
        { backgroundColor: pressed ? c.yellowPressed : c.yellow, borderRadius: radius.pill },
      ]}
    >
      <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: c.onYellow }]}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, icon, loading, disabled }: { title: string; onPress: () => void; icon?: ReactNode; loading?: boolean; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{disabled: !!(disabled || loading), busy: !!loading}}
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
          <Text style={[styles.buttonText, { color: c.link }]}>{title}</Text>
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
    <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: error ? c.dangerSoft : c.primarySoft }]}>
      <Text style={{ color: error ? c.danger : c.link, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  field: { gap: 8 },
  label: { fontSize: 13, fontFamily: fonts.semibold },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16, minHeight: 56 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, fontFamily: fonts.regular },
  button: { minHeight: 52, paddingVertical: 14, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  secondary: { borderWidth: 1 },
  small: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 18 },
  buttonText: { ...t.button, flexShrink: 1, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  card: { borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  notice: { borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12 },
});

/**
 * Carte du design system (« Toutes les conversations », messages…) :
 * fond surface/card (ou surface/info avec `tone="info"`), bordure, rayon 14, padding 16.
 */
export function Card({ tone = 'default', onPress, children, accessibilityLabel }: { tone?: 'default' | 'info'; onPress?: () => void; children: ReactNode; accessibilityLabel?: string }) {
  const c = useColors();
  const bg = tone === 'info' ? c.surfaceAlt : c.surface;
  const style = { backgroundColor: bg, borderColor: c.border };
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && { backgroundColor: c.surfaceAlt, borderColor: c.focus }]}
    >
      {children}
    </Pressable>
  );
}
