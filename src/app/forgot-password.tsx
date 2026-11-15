import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SignupShell } from '@/components/signup';
import { Card, Field, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { typography as t, useColors } from '@/theme';

/**
 * Maquettes Figma « 🔐 Mot de passe oublié » : saisie, e-mail invalide, envoi en cours,
 * « Vérifiez vos e-mails », « L’envoi n’a pas abouti ».
 * La suite (nouveau mot de passe, lien expiré, mot de passe réinitialisé) se passe
 * sur la page du site ouverte depuis le lien reçu par e-mail.
 */

type Phase = 'form' | 'sent' | 'failed';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ForgotPasswordScreen() {
  const c = useColors();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [phase, setPhase] = useState<Phase>('form');
  const [sending, setSending] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const value = email.trim().toLowerCase();
  const toLogin = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  const send = async () => {
    if (!EMAIL.test(value)) {
      setInvalid('Saisissez une adresse complète, par exemple thomas@exemple.fr.');
      return;
    }
    setInvalid(null);
    setServerError(null);
    setSending(true);
    try {
      await api.forgotPassword(value);
      setPhase('sent');
    } catch (e) {
      // Erreur de saisie renvoyée par l'API (400) : on la montre sous le champ.
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 429) {
        setInvalid(e.message);
        setPhase('form');
      } else {
        setServerError(e instanceof Error ? e.message : null);
        setPhase('failed');
      }
    } finally {
      setSending(false);
    }
  };

  const editAddress = () => {
    setPhase('form');
    setServerError(null);
  };

  // ─── « Vérifiez vos e-mails » ──────────────────────────────────────────
  if (phase === 'sent') {
    return (
      <SignupShell
        icon="mail-outline"
        eyebrow="RÉCUPÉRER MON ACCÈS"
        title="Vérifiez vos e-mails"
        subtitle="Si un compte est associé à cette adresse, vous recevrez un lien de réinitialisation."
        onBack={toLogin}
      >
        <Card tone="info">
          <Text style={[t.cardTitle, { color: c.text, fontSize: 14 }]}>{value}</Text>
          <Pressable accessibilityRole="button" onPress={editAddress} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Text style={[t.caption, { color: c.link, fontSize: 13 }]}>Modifier l’adresse</Text>
          </Pressable>
        </Card>
        <Card tone="info">
          <Text style={[t.cardTitle, { color: c.link, fontSize: 14 }]}>Vous ne trouvez pas l’e-mail ?</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            Vérifiez vos spams ou courriers indésirables et assurez-vous que l’adresse est correcte. Le lien est valable 1 heure.
          </Text>
        </Card>
        <SecondaryButton title="Renvoyer le lien" onPress={send} loading={sending} />
      </SignupShell>
    );
  }

  // ─── « L’envoi n’a pas abouti » ────────────────────────────────────────
  if (phase === 'failed') {
    return (
      <SignupShell
        icon="cloud-offline-outline"
        iconTone="danger"
        eyebrow="RÉCUPÉRER MON ACCÈS"
        title="L’envoi n’a pas abouti"
        subtitle="Un problème de connexion ou de service a empêché le traitement de votre demande."
        onBack={toLogin}
      >
        <Field label="E-mail du compte" value={email} editable={false} />
        <View style={{ backgroundColor: c.dangerSoft, borderRadius: 12, padding: 14, gap: 4 }}>
          <Text style={[t.cardTitle, { color: c.danger, fontSize: 14 }]}>Vous pouvez réessayer</Text>
          <Text style={[t.cardText, { color: c.danger }]}>
            {serverError && /connexion/i.test(serverError) ? 'Vérifiez votre connexion, puis relancez l’envoi. ' : 'Relancez l’envoi dans quelques instants. '}
            Votre adresse a été conservée.
          </Text>
        </View>
        <PrimaryButton title="Réessayer" onPress={send} loading={sending} />
        <Pressable accessibilityRole="button" onPress={editAddress} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <Text style={[t.caption, { color: c.link, fontSize: 13 }]}>Modifier l’adresse</Text>
        </Pressable>
      </SignupShell>
    );
  }

  // ─── Saisie / adresse invalide / envoi en cours ────────────────────────
  return (
    <SignupShell
      icon="key-outline"
      eyebrow="RÉCUPÉRER MON ACCÈS"
      title="Mot de passe oublié ?"
      subtitle="Indiquez l’adresse e-mail de votre compte pour demander un lien de réinitialisation."
      onBack={toLogin}
    >
      <Field
        label="E-mail du compte"
        placeholder="nom@exemple.fr"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (invalid) setInvalid(null);
        }}
        onSubmitEditing={send}
        editable={!sending}
        autoFocus={!email}
        error={invalid}
      />
      <PrimaryButton title={sending ? 'Envoi en cours…' : 'Envoyer le lien'} onPress={send} loading={sending} />
      <Card tone="info">
        {sending ? (
          <>
            <Text style={[t.cardTitle, { color: c.link, fontSize: 14 }]}>Demande en cours de traitement</Text>
            <Text style={[t.cardText, { color: c.muted }]}>Patientez un instant. Il n’est pas nécessaire de renvoyer votre demande.</Text>
          </>
        ) : invalid ? (
          <>
            <Text style={[t.cardTitle, { color: c.link, fontSize: 14 }]}>Vérifiez votre saisie</Text>
            <Text style={[t.cardText, { color: c.muted }]}>Il manque peut-être une partie de votre adresse, par exemple après le point.</Text>
          </>
        ) : (
          <>
            <Text style={[t.cardTitle, { color: c.link, fontSize: 14 }]}>Retrouvez votre espace en toute simplicité</Text>
            <Text style={[t.cardText, { color: c.muted }]}>Vous pourrez choisir un nouveau mot de passe depuis le lien reçu par e-mail.</Text>
          </>
        )}
      </Card>
    </SignupShell>
  );
}
