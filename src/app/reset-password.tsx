import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { SignupShell } from '@/components/signup';
import { Card, Field, Notice, PrimaryButton, type TextInputRef } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { PASSWORD_RULE, passwordError } from '@/lib/password';
import { typography as t, useColors } from '@/theme';

/**
 * Maquettes Figma « 🔐 Mot de passe oublié », suite du lien reçu par e-mail :
 * « Nouveau mot de passe », « Les mots de passe ne correspondent pas »,
 * « Ce lien n’est plus valide », « Mot de passe réinitialisé ».
 * Ouvert par esupadom://reset-password?token=… depuis la page passerelle de l'API
 * (GET /api/v1/auth/reset-password/open).
 */

type Phase = 'checking' | 'form' | 'invalid' | 'social' | 'done' | 'offline';
const MISMATCH = 'Les mots de passe ne correspondent pas. Saisissez à nouveau le même mot de passe.';

/** Lien expiré / déjà utilisé, ou compte Google sans mot de passe ; null = autre erreur (réseau…). */
function classify(e: unknown): { phase: 'invalid' | 'social'; authMethod?: string } | null {
  if (!(e instanceof ApiError)) return null;
  const code = e.body?.error;
  if (code === 'SOCIAL_LOGIN_ACCOUNT') {
    return { phase: 'social', authMethod: typeof e.body?.authMethod === 'string' ? e.body.authMethod : 'Google' };
  }
  if (code === 'INVALID_TOKEN' || (e.status === 400 && code !== 'WEAK_PASSWORD')) return { phase: 'invalid' };
  return null;
}

export default function ResetPasswordScreen() {
  const c = useColors();
  const { token: rawToken } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const confirmRef = useRef<TextInputRef>(null);

  // Résultat de l'enregistrement (prend le pas sur la vérification du lien).
  const [outcome, setOutcome] = useState<{ phase: 'invalid' | 'social' | 'done'; email?: string; authMethod?: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Le lien est vérifié dès l'ouverture : « Ce lien n'est plus valide » avant toute saisie.
  const check = useQuery({
    queryKey: ['reset-password-token', token],
    queryFn: () => api.verifyResetToken(token as string),
    enabled: !!token,
    staleTime: Infinity,
    gcTime: 0,
    retry: (count, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && count < 1,
  });

  const tokenIssue = classify(check.error);
  const phase: Phase = outcome?.phase
    ?? (!token ? 'invalid' : check.isPending ? 'checking' : check.isError ? tokenIssue?.phase ?? 'offline' : 'form');
  const email = outcome?.email ?? check.data?.email ?? '';
  const authMethod = outcome?.authMethod ?? tokenIssue?.authMethod ?? 'Google';
  const verify = () => void check.refetch();

  const toLogin = () => router.dismissTo('/login');
  const requestNewLink = () => router.replace({ pathname: '/forgot-password', params: email ? { email } : {} });

  const submit = async () => {
    const weak = passwordError(password);
    const mismatch = !weak && password !== confirm ? MISMATCH : null;
    setPasswordErr(weak);
    setConfirmErr(mismatch);
    setNotice(null);
    if (weak || mismatch || !token) return;
    setSubmitting(true);
    try {
      const res = await api.resetPassword(token, password);
      setOutcome({ phase: 'done', email: res.email || email });
    } catch (e) {
      const issue = classify(e);
      if (e instanceof ApiError && e.body?.error === 'WEAK_PASSWORD') setPasswordErr(e.message);
      else if (e instanceof ApiError && e.status === 429) setNotice('Trop de tentatives. Patientez une minute, puis réessayez.');
      else if (issue) setOutcome(issue);
      else setNotice(e instanceof Error ? e.message : 'L’enregistrement n’a pas abouti. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Vérification du lien ──────────────────────────────────────────────
  if (phase === 'checking' || phase === 'offline') {
    return (
      <SignupShell
        icon="lock-closed-outline"
        eyebrow="CHOISIR UN NOUVEL ACCÈS"
        title="Nouveau mot de passe"
        subtitle="Choisissez un mot de passe unique, différent de celui de vos autres comptes."
        onBack={toLogin}
      >
        {phase === 'checking' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
            <ActivityIndicator color={c.primary} />
            <Text style={[t.cardText, { color: c.muted }]}>Vérification du lien…</Text>
          </View>
        ) : (
          <>
            <Notice kind="error">Le lien n’a pas pu être vérifié. Vérifiez votre connexion, puis réessayez.</Notice>
            <PrimaryButton title="Réessayer" icon="refresh" onPress={verify} loading={check.isFetching} />
          </>
        )}
      </SignupShell>
    );
  }

  // ─── « Ce lien n’est plus valide » ────────────────────────────────────
  if (phase === 'invalid') {
    return (
      <SignupShell
        icon="unlink-outline"
        eyebrow="RÉCUPÉRER MON ACCÈS"
        title="Ce lien n’est plus valide"
        subtitle="Il a peut-être expiré ou a déjà été utilisé. Demandez un nouveau lien pour poursuivre."
        onBack={toLogin}
      >
        <PrimaryButton title="Demander un nouveau lien" onPress={requestNewLink} />
        <Card>
          <Text style={[t.cardTitle, { color: c.link, fontSize: 14 }]}>Utilisez le lien le plus récent</Text>
          <Text style={[t.cardText, { color: c.muted }]}>Si vous avez fait plusieurs demandes, ouvrez le dernier e-mail reçu.</Text>
        </Card>
      </SignupShell>
    );
  }

  // ─── Compte Google / Facebook (sans mot de passe) ──────────────────────
  if (phase === 'social') {
    return (
      <SignupShell
        icon="logo-google"
        eyebrow="RÉCUPÉRER MON ACCÈS"
        title="Compte sans mot de passe"
        subtitle={`Ce compte a été créé avec ${authMethod} : il n’a pas de mot de passe à réinitialiser.`}
        onBack={toLogin}
      >
        <PrimaryButton title="Retour à la connexion" icon="arrow-forward" onPress={toLogin} />
        <Card>
          <Text style={[t.cardTitle, { color: c.link, fontSize: 14 }]}>Comment vous connecter</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            Sur l’écran de connexion, touchez « Continuer avec {authMethod} ».
          </Text>
        </Card>
      </SignupShell>
    );
  }

  // ─── « Mot de passe réinitialisé » ────────────────────────────────────
  if (phase === 'done') {
    return (
      <SignupShell
        hideBack
        icon="checkmark"
        iconTone="success"
        eyebrow="VOUS POUVEZ CONTINUER"
        title="Mot de passe réinitialisé"
        subtitle="Vous pouvez maintenant vous connecter à votre espace avec votre nouveau mot de passe."
      >
        <PrimaryButton
          title="Se connecter"
          icon="arrow-forward"
          onPress={() => router.dismissTo({ pathname: '/login', params: { email, reset: '1' } })}
        />
        <Card>
          <Text style={[t.cardTitle, { color: c.link, fontSize: 14 }]}>Votre prochaine étape</Text>
          <Text style={[t.cardText, { color: c.muted }]}>Retrouvez vos cours et vos messages depuis la page de connexion.</Text>
        </Card>
      </SignupShell>
    );
  }

  // ─── « Nouveau mot de passe » / non-correspondance ─────────────────────
  const eye = (visible: boolean, toggle: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      onPress={toggle}
      hitSlop={10}
    >
      <Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={21} color={c.link} />
    </Pressable>
  );

  return (
    <SignupShell
      icon="lock-closed-outline"
      eyebrow="CHOISIR UN NOUVEL ACCÈS"
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe unique, différent de celui de vos autres comptes."
      onBack={toLogin}
    >
      <View style={{ gap: 8 }}>
        <Field
          label="Nouveau mot de passe"
          placeholder="Saisir un mot de passe"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (passwordErr) setPasswordErr(null);
          }}
          onSubmitEditing={() => confirmRef.current?.focus()}
          editable={!submitting}
          autoFocus
          error={passwordErr}
          right={eye(showPassword, () => setShowPassword((v) => !v))}
        />
        {!passwordErr && <Text style={[t.captionRegular, { color: c.muted }]}>{PASSWORD_RULE}</Text>}
      </View>
      <Field
        ref={confirmRef}
        label="Confirmer le mot de passe"
        placeholder="Saisir à nouveau"
        secureTextEntry={!showConfirm}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        value={confirm}
        onChangeText={(v) => {
          setConfirm(v);
          if (confirmErr) setConfirmErr(null);
        }}
        onSubmitEditing={submit}
        editable={!submitting}
        error={confirmErr}
        right={eye(showConfirm, () => setShowConfirm((v) => !v))}
      />
      {notice && <Notice kind="error">{notice}</Notice>}
      <PrimaryButton title="Réinitialiser mon mot de passe" onPress={submit} loading={submitting} loadingTitle="Enregistrement…" />
    </SignupShell>
  );
}
