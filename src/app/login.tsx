import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useColors } from '@/theme';

export default function LoginScreen() {
  const { signIn, token } = useAuth();
  const c = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (token) return <Redirect href="/conversations" />;

  const onSubmit = async () => {
    if (!email || !password) return setError('Courriel et mot de passe requis.');
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const input = [styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        style={[styles.flex, styles.container]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={[styles.title, { color: c.text }]}>e-supadom</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Connecte-toi pour discuter avec tes profs et tes élèves.
        </Text>

        <TextInput
          style={input}
          placeholder="Courriel"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={input}
          placeholder="Mot de passe"
          placeholderTextColor={c.muted}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={onSubmit}
        />

        {error && <Text style={[styles.error, { color: c.danger }]}>{error}</Text>}

        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: c.primary, opacity: pressed || submitting ? 0.7 : 1 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <Text style={[styles.buttonText, { color: c.onPrimary }]}>Se connecter</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 15, marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  error: { fontSize: 14 },
  button: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
