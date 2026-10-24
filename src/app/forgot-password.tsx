import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field, Notice, PrimaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { radius, shadow, useColors } from '@/theme';

/** Mot de passe oublié : l'API envoie le lien de réinitialisation (page du site). */
export default function ForgotPasswordScreen() {
  const c = useColors();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) return setError('Saisis une adresse e-mail valide.');
    setError(null);
    setSending(true);
    try {
      await api.forgotPassword(value);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible pour le moment.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <Text style={{ color: c.primary, fontSize: 16, fontWeight: '600' }}>‹ Retour</Text>
          </Pressable>

          <View style={styles.head}>
            <Text style={[styles.title, { color: c.text }]}>Mot de passe oublié</Text>
            <Text style={[styles.subtitle, { color: c.muted }]}>
              Indique ton adresse e-mail : tu recevras un lien pour choisir un nouveau mot de passe (valable 1 heure).
            </Text>
          </View>

          <View style={[styles.card, shadow, { backgroundColor: c.surface }]}>
            {sent ? (
              <>
                <Notice kind="success">
                  Si un compte existe avec {email.trim()}, un e-mail vient de partir. Pense à regarder dans les indésirables.
                </Notice>
                <PrimaryButton title="Revenir à la connexion" onPress={() => router.back()} />
              </>
            ) : (
              <>
                <Field
                  label="Adresse e-mail"
                  placeholder="prenom.nom@exemple.fr"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={onSubmit}
                  autoFocus={!email}
                />
                {error && <Notice kind="error">{error}</Notice>}
                <PrimaryButton title="Envoyer le lien" onPress={onSubmit} loading={sending} />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, gap: 20 },
  back: { alignSelf: 'flex-start', paddingVertical: 4 },
  head: { gap: 8, marginTop: 12 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 15, lineHeight: 21 },
  card: { borderRadius: radius.lg, padding: 20, gap: 16 },
});
