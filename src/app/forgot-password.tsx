import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SignupShell } from '@/components/signup';
import { Card, Field, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { typography as t, useColors } from '@/theme';

/**
 * Maquettes Figma « 🔐 Mot de passe oublié » : saisie, e-mail invalide, envoi en cours,
 * « Vérifiez vos e-mails », « L’envoi n’a pas abouti ».
 * La suite (nouveau mot de passe, lien expiré, mot de passe réinitialisé) se passe
 * sur la page du site ouverte depuis le lien reçu par e-mail ; l'utilisateur revient
 * ensuite dans l'app : l'écran « Vérifiez vos e-mails » le renvoie à la connexion,
 * adresse pré-remplie.
 */

type Phase = 'form' | 'sent' | 'failed';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** L'API accepte 3 demandes / minute / IP : on espace les renvois pour ne jamais tomber sur le 429. */
const RESEND_COOLDOWN_S = 30;
const TOO_MANY = 'Trop de demandes rapprochées. Patientez une minute avant de renvoyer le lien.';

export default function ForgotPasswordScreen() {
  const c = useColors();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [phase, setPhase] = useState<Phase>('form');
  const [sending, setSending] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  // Écran « Vérifiez vos e-mails » : retour du renvoi + délai avant le prochain renvoi.
  const [resendNotice, setResendNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const value = email.trim().toLowerCase();
  const toLogin = () => (router.canGoBack() ? router.back() : router.replace('/login'));
  /** Après la réinitialisation sur le site : connexion avec l'adresse déjà saisie. */
  const loginWithNewPassword = () =>
    router.dismissTo({ pathname: '/login', params: { email: value, reset: '1' } });

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
      setResendNotice(null);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (e) {
      // Erreur de saisie renvoyée par l'API (400) : on la montre sous le champ.
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 429) {
        setInvalid(e.message);
        setPhase('form');
      } else {
        setServerError(e instanceof ApiError && e.status === 429 ? TOO_MANY : e instanceof Error ? e.message : null);
        setPhase('failed');
      }
    } finally {
      setSending(false);
    }
  };

  /** Renvoi depuis « Vérifiez vos e-mails » : on reste sur l'écran et on confirme l'envoi. */
  const resend = async () => {
    setSending(true);
    setResendNotice(null);
    try {
      await api.forgotPassword(value);
      setResendNotice({ kind: 'success', text: `Nouveau lien envoyé à ${value}. Utilisez celui de ce dernier e-mail.` });
      setCooldown(RESEND_COOLDOWN_S);
    } catch (e) {
      const text =
        e instanceof ApiError && e.status === 429
          ? TOO_MANY
          : e instanceof Error
            ? e.message
            : 'L’envoi n’a pas abouti. Réessayez dans quelques instants.';
      setResendNotice({ kind: 'error', text });
      if (e instanceof ApiError && e.status === 429) setCooldown(60);
    } finally {
      setSending(false);
    }
  };

  const editAddress = () => {
    setPhase('form');
    setServerError(null);
    setResendNotice(null);
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

        <View style={{ gap: 10 }}>
          <Text style={[t.cardText, { color: c.muted }]}>
            Mot de passe modifié depuis le lien ? Revenez ici pour vous connecter.
          </Text>
          <PrimaryButton title="Se connecter" icon="arrow-forward" onPress={loginWithNewPassword} />
        </View>

        <Card tone="info">
          <Text style={[t.cardTitle, { color: c.link, fontSize: 14 }]}>Vous ne trouvez pas l’e-mail ?</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            Vérifiez vos spams ou courriers indésirables et assurez-vous que l’adresse est correcte. Le lien est valable 1 heure ;
            si vous en demandez un autre, seul le dernier reçu fonctionne.
          </Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            Compte créé avec Google ? Il n’a pas de mot de passe : utilisez « Continuer avec Google » sur l’écran de connexion.
          </Text>
        </Card>

        {resendNotice && <Notice kind={resendNotice.kind}>{resendNotice.text}</Notice>}
        <SecondaryButton
          title={cooldown > 0 ? `Renvoyer le lien (${cooldown} s)` : 'Renvoyer le lien'}
          onPress={resend}
          loading={sending}
          disabled={cooldown > 0}
        />
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
        <Field
          label="E-mail du compte"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!sending}
        />
        <View style={{ backgroundColor: c.dangerSoft, borderRadius: 12, padding: 14, gap: 4 }}>
          <Text style={[t.cardTitle, { color: c.danger, fontSize: 14 }]}>Vous pouvez réessayer</Text>
          <Text style={[t.cardText, { color: c.danger }]}>
            {serverError === TOO_MANY
              ? `${TOO_MANY} `
              : serverError && /connexion/i.test(serverError)
                ? 'Vérifiez votre connexion, puis relancez l’envoi. '
                : 'Relancez l’envoi dans quelques instants. '}
            Votre adresse a été conservée.
          </Text>
        </View>
        <PrimaryButton title="Réessayer" icon="refresh" onPress={send} loading={sending} loadingTitle="Envoi en cours…" />
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
      <PrimaryButton title="Envoyer le lien" icon="arrow-forward" onPress={send} loading={sending} loadingTitle="Envoi en cours…" />
      <Card tone="info">
        {sending ? (
          <>
            <Text style={[t.cardTitle, { color: c.link, fontSize: 14 }]}>Demande en cours de traitement</Text>
            <Text style={[t.cardText, { color: c.muted }]}>Patientez un instant. Il n’est pas nécessaire de renvoyer votre demande.</Text>
          </>
        ) : invalid ? (
          <>
            <Text style={[t.cardTitle, { color: c.link, fontSize: 14 }]}>Vérifiez votre saisie</Text>
            <Text style={[t.cardText, { color: c.muted }]}>Il manque peut-être une partie de votre adresse après le point.</Text>
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
