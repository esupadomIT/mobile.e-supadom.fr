import { Link, Redirect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleButton, googleEnabled } from '@/components/GoogleButton';
import { Divider, Field, Notice, PrimaryButton, type TextInputRef } from '@/components/ui';
import { SITE_URL } from '@/config';
import { useAuth } from '@/lib/auth';
import { radius, shadow, useColors } from '@/theme';

export default function LoginScreen() {
  const { signIn, signInWithGoogle, token } = useAuth();
  const c = useColors();
  const passwordRef = useRef<TextInputRef>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

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

  if (token) return <Redirect href="/conversations" />;

  const onSubmit = async () => {
    if (!email.trim() || !password) return setError('Saisis ton adresse e-mail et ton mot de passe.');
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.title, { color: c.text }]}>Bon retour !</Text>
            <Text style={[styles.subtitle, { color: c.muted }]}>
              Connecte-toi pour échanger avec tes profs et tes élèves.
            </Text>
          </View>

          <View style={[styles.card, shadow, { backgroundColor: c.surface }]}>
            <Field
              label="Adresse e-mail"
              placeholder="prenom.nom@exemple.fr"
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
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <Text style={{ color: c.primary, fontWeight: '600', fontSize: 14 }}>
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </Text>
                </Pressable>
              }
            />

            <Link href={{ pathname: '/forgot-password', params: { email } }} asChild>
              <Pressable hitSlop={8} style={styles.forgot}>
                <Text style={{ color: c.primary, fontWeight: '600', fontSize: 14 }}>Mot de passe oublié ?</Text>
              </Pressable>
            </Link>

            {error && <Notice kind="error">{error}</Notice>}

            <PrimaryButton title="Se connecter" onPress={onSubmit} loading={submitting} />

            {googleEnabled && (
              <>
                <Divider label="ou" />
                <GoogleButton onIdToken={onGoogleToken} onError={setError} busy={googleBusy} />
              </>
            )}
          </View>

          <Pressable onPress={() => Linking.openURL(`${SITE_URL}/signup`)} style={styles.footer} hitSlop={8}>
            <Text style={{ color: c.muted, fontSize: 14, textAlign: 'center' }}>
              Pas encore de compte ? <Text style={{ color: c.primary, fontWeight: '700' }}>Inscris-toi sur e-supadom.fr</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 20 },
  brand: { alignItems: 'center', gap: 6 },
  logo: { width: 180, height: 72, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 21, maxWidth: 300 },
  card: { borderRadius: radius.lg, padding: 20, gap: 16 },
  forgot: { alignSelf: 'flex-end', marginTop: -6 },
  footer: { paddingVertical: 8 },
});
