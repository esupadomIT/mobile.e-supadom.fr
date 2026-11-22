import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';
import { fonts, radius, typography as t, useColors } from '@/theme';

/** Éléments communs aux parcours d'inscription (maquettes Figma « 🔑 Sign up »). */

export const CONTACT_EMAIL = 'contact@e-supadom.fr';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Pied de page « Une question ? Nous sommes là pour vous. · Aide & contact ». */
export function HelpFooter() {
  const c = useColors();
  return (
    <View style={[styles.footer, { borderTopColor: c.border }]}>
      <Text style={[t.captionRegular, { color: c.muted }]}>Une question ? Nous sommes là pour vous.</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push('/aide-contact')} hitSlop={8}>
        <Text style={[t.caption, { color: c.link, fontSize: 13 }]}>Aide & contact</Text>
      </Pressable>
    </View>
  );
}

/**
 * Écran d'inscription : « Retour à la connexion », logo, badge « Étape x/y »,
 * titre et sous-titre, contenu défilant, pied de page d'aide.
 */
export function SignupShell({
  step,
  total,
  title,
  subtitle,
  eyebrow,
  onBack,
  backLabel = 'Retour à la connexion',
  hideBack = false,
  hideHelp = false,
  icon,
  iconTone = 'info',
  children,
}: {
  icon?: IconName;
  iconTone?: 'info' | 'danger' | 'success';
  step?: number;
  total?: number;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  backLabel?: string;
  /** Écran final sans lien retour (maquette « Mot de passe réinitialisé »). */
  hideBack?: boolean;
  /** Sans le pied de page « Aide & contact » (écrans de l'aide eux-mêmes). */
  hideHelp?: boolean;
  children: ReactNode;
}) {
  const c = useColors();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/login')));
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.surface }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {hideBack ? null : (
            <Pressable accessibilityRole="button" onPress={back} hitSlop={10} style={styles.back}>
              <Ionicons name="arrow-back" size={16} color={c.link} />
              <Text style={[t.caption, { color: c.link, fontSize: 13 }]}>{backLabel}</Text>
            </Pressable>
          )}

          <View style={styles.brand}>
            <BrandLogo style={styles.logo} />
            {step && total ? (
              <View style={[styles.stepBadge, { backgroundColor: c.surfaceAlt }]}>
                <Text style={[t.caption, { color: c.link }]}>
                  Étape {step}/{total}
                </Text>
              </View>
            ) : null}
          </View>

          {step && total ? (
            <View style={[styles.progress, { backgroundColor: c.border }]}>
              <View style={[styles.progressFill, { backgroundColor: c.primary, width: `${(step / total) * 100}%` }]} />
            </View>
          ) : null}

          {icon ? (
            <View
              style={[
                styles.icon,
                { backgroundColor: iconTone === 'danger' ? c.dangerSoft : iconTone === 'success' ? c.accentSoft : c.surfaceAlt },
              ]}
            >
              <Ionicons name={icon} size={22} color={iconTone === 'danger' ? c.danger : iconTone === 'success' ? c.onAccent : c.primary} />
            </View>
          ) : null}

          <View style={{ gap: 4 }}>
            {eyebrow ? <Text style={[styles.eyebrow, { color: c.primary }]}>{eyebrow}</Text> : null}
            <Text style={[t.title, { color: c.text, fontSize: 24, lineHeight: 32 }]}>{title}</Text>
            {subtitle ? <Text style={[t.body, { color: c.muted }]}>{subtitle}</Text> : null}
          </View>

          {children}

          {hideHelp ? null : <HelpFooter />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Pastille à cocher (niveaux, matières…). */
export function CheckChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? c.primary : c.border,
          backgroundColor: selected ? c.primarySoft : pressed ? c.surfaceAlt : c.surface,
        },
      ]}
    >
      <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={17} color={selected ? c.primary : c.subtle} />
      <Text style={[t.cardText, { color: c.text, fontFamily: selected ? fonts.semibold : fonts.regular }]}>{label}</Text>
    </Pressable>
  );
}

/** Option à choix unique sous forme de ligne (radio). */
export function RadioRow({ label, hint, selected, onPress, badge }: { label: string; hint?: string; selected: boolean; onPress: () => void; badge?: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.radio,
        { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : pressed ? c.surfaceAlt : c.surface },
      ]}
    >
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? c.primary : c.subtle} />
      <View style={{ flex: 1 }}>
        <Text style={[t.cardText, { color: c.text, fontFamily: fonts.semibold }]}>{label}</Text>
        {hint ? <Text style={[t.captionRegular, { color: c.muted }]}>{hint}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
          <Text style={[t.caption, { color: c.onAccent }]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Grande carte de choix de rôle (« Élève ou Parent », « Professeur particulier »). */
export function RoleCard({
  icon,
  title,
  text,
  cta,
  tone,
  onPress,
}: {
  icon: IconName;
  title: string;
  text: string;
  cta: string;
  tone: 'primary' | 'yellow';
  onPress: () => void;
}) {
  const c = useColors();
  const yellow = tone === 'yellow';
  return (
    <View style={[styles.roleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.roleIcon, { backgroundColor: c.surfaceAlt }]}>
        <Ionicons name={icon} size={26} color={c.primary} />
      </View>
      <Text style={[t.cardTitle, { color: c.text, fontSize: 17, textAlign: 'center' }]}>{title}</Text>
      <Text style={[t.captionRegular, { color: c.muted, textAlign: 'center' }]}>{text}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.roleCta,
          {
            backgroundColor: yellow ? (pressed ? c.yellowPressed : c.yellow) : pressed ? c.primaryPressed : c.primary,
          },
        ]}
      >
        <Text style={[t.button, { color: yellow ? c.onYellow : c.onPrimary }]}>{cta}</Text>
        <Ionicons name="arrow-forward" size={16} color={yellow ? c.onYellow : c.onPrimary} />
      </Pressable>
    </View>
  );
}

/** Libellé de groupe de champs (« Niveaux accompagnés * »). */
export function GroupLabel({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[t.caption, { color: c.text, fontSize: 13 }]}>{children}</Text>;
}

export const signupStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gap: { gap: 16 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 8, paddingBottom: 28, gap: 20, width: '100%', maxWidth: 540, alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 140, height: 38 },
  stepBadge: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  progress: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: -8 },
  progressFill: { height: 4, borderRadius: 2 },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: -8 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2 },
  footer: { alignItems: 'center', gap: 8, paddingTop: 20, marginTop: 'auto', borderTopWidth: StyleSheet.hairlineWidth * 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  radio: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.md, padding: 14 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  roleCard: { borderWidth: 1, borderRadius: radius.lg, padding: 20, alignItems: 'center', gap: 8 },
  roleIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  roleCta: { marginTop: 8, alignSelf: 'stretch', minHeight: 48, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
