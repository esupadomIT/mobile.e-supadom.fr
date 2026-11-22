import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';
import { GoogleButton, googleEnabled } from '@/components/GoogleButton';
import { Divider, Field, Notice, PrimaryButton, type TextInputRef } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fonts, radius, typography as t, useColors } from '@/theme';


/** Maquette Figma « 🔑 Sign up - Log in » : écran « 01 Connexion ». */
export default function LoginScreen() {
  const { signIn, signInWithGoogle, token } = useAuth();
  const c = useColors();
  // Retour depuis « Mot de passe oublié » : adresse pré-remplie (+ reset=1 après réinitialisation).
  const params = useLocalSearchParams<{ email?: string; reset?: string }>();
  const passwordRef = useRef<TextInputRef>(null);
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resetDone, setResetDone] = useState(params.reset === '1');

  // Nouveaux paramètres reçus (écran déjà monté, retour via dismissTo) : on réinitialise le formulaire.
  const paramsKey = `${params.email ?? ''}|${params.reset ?? ''}`;
  const [seenParams, setSeenParams] = useState(paramsKey);
  if (paramsKey !== seenParams) {
    setSeenParams(paramsKey);
    if (params.email) {
      setEmail(params.email);
      setPassword('');
      setError(null);
      setResetDone(params.reset === '1');
    }
  }

  useEffect(() => {
    if (!params.email) return;
    // Le clavier s'ouvre directement sur le mot de passe.
    const timer = setTimeout(() => passwordRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [params.email, params.reset]);

  const onGoogleToken = useCallback(
    async (idToken: string) => {
      setError(null);
      setGoogleBusy(true);
      try {
        await signInWithGoogle(idToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Connexion Google impossible.');
      } finally {
        setGoogleBusy(false);
      }
    },
    [signInWithGoogle],
  );

  if (token) return <Redirect href="/accueil" />;

  const onSubmit = async () => {
    if (!email.trim() || !password) return setError('Saisissez votre adresse e-mail et votre mot de passe.');
    setError(null);
    setResetDone(false);
    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (e) {
      // 429 : l'API limite à 5 essais / minute ; le message brut du throttler est en anglais.
      if (e instanceof ApiError && e.status === 429) setError('Trop de tentatives. Patientez une minute, puis réessayez.');
      else setError(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.surface }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <BrandLogo style={styles.logo} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aide et contact"
              onPress={() => router.push('/aide-contact')}
              hitSlop={10}
            >
              <Ionicons name="help-circle-outline" size={24} color={c.link} />
            </Pressable>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={[styles.eyebrow, { color: c.primary }]}>VOTRE ESPACE COURS</Text>
            <Text style={[t.title, { color: c.text }]}>Ravi de vous revoir</Text>
            <Text style={[t.body, { color: c.muted }]}>Retrouvez vos cours et vos échanges, simplement.</Text>
          </View>

          <View style={{ gap: 16 }}>
            <Field
              label="Adresse e-mail"
              placeholder="nom@exemple.fr"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Field
              ref={passwordRef}
              label="Mot de passe"
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={onSubmit}
              right={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={10}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={c.link} />
                </Pressable>
              }
            />

            <Link href={{ pathname: '/forgot-password', params: { email } }} asChild>
              <Pressable hitSlop={8} style={styles.forgot}>
                <Text style={[t.caption, { color: c.link, fontSize: 13 }]}>Mot de passe oublié ?</Text>
              </Pressable>
            </Link>

            {resetDone && !error && (
              <Notice kind="success">Mot de passe modifié ? Saisissez votre nouveau mot de passe pour vous connecter.</Notice>
            )}
            {error && <Notice kind="error">{error}</Notice>}

            <PrimaryButton title="Se connecter" onPress={onSubmit} loading={submitting} />

            {googleEnabled && (
              <>
                <Divider label="ou" />
                <GoogleButton onIdToken={onGoogleToken} onError={setError} busy={googleBusy} />
              </>
            )}
          </View>

          <View style={{ gap: 6, alignItems: 'center' }}>
            <Text style={[t.cardText, { color: c.muted }]}>Élève ou parent, pas encore de compte ?</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/inscription')} hitSlop={8}>
              <Text style={[t.caption, styles.underline, { color: c.link, fontSize: 13 }]}>Créer un compte</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/inscription/professeur')}
            style={({ pressed }) => [styles.teacher, { backgroundColor: pressed ? c.accent : c.accentSoft }]}
          >
            <Ionicons name="school-outline" size={20} color={c.onAccent} />
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.text, fontSize: 14 }]}>Devenir professeur</Text>
              <Text style={[t.captionRegular, { color: c.onAccent }]}>Déposer ma candidature</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={c.onAccent} />
          </Pressable>

          <View style={[styles.footer, { borderTopColor: c.border }]}>
            <Text style={[t.captionRegular, { color: c.muted }]}>Une question ? Nous sommes là pour vous.</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/aide-contact')} hitSlop={8}>
              <Text style={[t.caption, { color: c.link, fontSize: 13 }]}>Aide & contact</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 12, paddingBottom: 28, gap: 24, width: '100%', maxWidth: 540, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 140, height: 38 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2 },
  forgot: { alignSelf: 'flex-end', marginTop: -4 },
  underline: { textDecorationLine: 'underline' },
  teacher: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, padding: 16 },
  footer: { alignItems: 'center', gap: 8, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth * 2 },
});
