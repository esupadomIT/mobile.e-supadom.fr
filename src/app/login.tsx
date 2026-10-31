import Ionicons from '@expo/vector-icons/Ionicons';
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

  if (token) return <Redirect href="/accueil" />;

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
            <View style={styles.logoBox}>
              <Image source={require('../../assets/logo-transparent.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={[styles.hero, { backgroundColor: c.primary }]}>
              <View pointerEvents="none" style={styles.heroRing} />
              <View style={styles.eyebrow}>
                <Ionicons name="school-outline" size={16} color="#6EE7B7" />
                <Text style={styles.eyebrowText}>TON ESPACE DE RÉUSSITE</Text>
              </View>
              <Text style={styles.title}>Un pas de plus{ '\n' }vers <Text style={{ color: '#6EE7B7' }}>tes objectifs.</Text></Text>
              <Text style={styles.subtitle}>Tes cours, tes échanges et tes progrès.{ '\n' }Tout commence ici.</Text>
            </View>
          </View>

          <View style={[styles.card, shadow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ gap: 5, marginBottom: 6 }}>
              <Text style={[styles.formTitle, { color: c.text }]}>Heureux de te retrouver</Text>
              <Text style={{ color: c.muted, fontSize: 14 }}>Connecte-toi à ton espace personnel.</Text>
            </View>
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
  scroll: { flexGrow: 1, padding: 20, paddingTop: 12, paddingBottom: 32, gap: 20, width: '100%', maxWidth: 540, alignSelf: 'center' },
  brand: { gap: 20 },
  logoBox: { alignSelf: 'flex-start', height: 46, paddingHorizontal: 10, justifyContent: 'center', overflow: 'hidden' },
  logo: { width: 136, height: 68 },
  hero: { borderRadius: 28, padding: 24, paddingBottom: 36, gap: 18, overflow: 'hidden' },
  heroRing: { position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 35, borderColor: 'rgba(255,255,255,0.07)', right: -100, top: -65 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrowText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#fff', fontSize: 32, lineHeight: 39, fontWeight: '800', letterSpacing: -1.2 },
  subtitle: { color: '#E4EFFF', fontSize: 14, lineHeight: 22 },
  formTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.6 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 22, gap: 18, marginTop: -36, marginHorizontal: 8 },
  forgot: { alignSelf: 'flex-end', marginTop: -6 },
  footer: { paddingVertical: 8 },
});
