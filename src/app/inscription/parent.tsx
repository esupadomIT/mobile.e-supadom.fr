import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SignupShell, signupStyles as s } from '@/components/signup';
import { PhoneField, PostalCityFields } from '@/components/CountryFields';
import { Field, Notice, PrimaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { DEFAULT_COUNTRY, isValidPhone, phoneToStore, postalCityError } from '@/lib/country';
import type { CountryCode } from 'libphonenumber-js/min';
import { radius, typography as t, useColors } from '@/theme';

/**
 * Maquette Figma « 🔑 Sign up - Parent / Tuteur » : compte PARENT à son nom
 * (coordonnées → logins → e-mail d'activation). Les enfants sont ajoutés
 * après la première connexion (Profil → Mes enfants).
 */

const TOTAL = 2;
const EMAIL = /^\S+@\S+\.\S+$/;

export default function ParentSignupScreen() {
  const c = useColors();
  const [step, setStep] = useState(1); // 1 = coordonnées, 2 = logins, 3 = envoyé
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const go = (next: number) => {
    setError(null);
    setStep(next);
  };
  const back = () => (step === 1 ? (router.canGoBack() ? router.back() : router.replace('/inscription')) : go(step - 1));

  const nextFromContact = () => {
    if (!firstName.trim() || !lastName.trim()) return setError('Renseignez votre prénom et votre nom.');
    if (!isValidPhone(country, phone)) return setError('Le numéro de téléphone est invalide.');
    const postalError = postalCityError(country, postalCode, city);
    if (postalError) return setError(postalError);
    go(2);
  };

  const submit = async () => {
    if (!EMAIL.test(email.trim())) return setError('Renseignez une adresse e-mail valide.');
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (password !== confirm) return setError('Les deux mots de passe ne correspondent pas.');
    setError(null);
    setSending(true);
    try {
      await api.signupParent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phoneToStore(country, phone),
        city: city.trim(),
        postalCode: postalCode.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      go(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’inscription n’a pas pu aboutir.');
    } finally {
      setSending(false);
    }
  };

  if (step === 3) {
    return (
      <SignupShell eyebrow="BIENVENUE CHEZ E-SUPADOM" title="Vérifiez vos e-mails" onBack={() => router.replace('/login')}>
        <View style={[styles.done, { backgroundColor: c.accentSoft }]}>
          <Ionicons name="mail-unread-outline" size={30} color={c.onAccent} />
          <Text style={[t.body, { color: c.text, textAlign: 'center' }]}>
            Nous avons envoyé un lien d’activation à{'\n'}
            <Text style={{ fontWeight: '700' }}>{email.trim().toLowerCase()}</Text>
          </Text>
          <Text style={[t.cardText, { color: c.muted, textAlign: 'center' }]}>
            Activez votre compte, connectez-vous, puis ajoutez vos enfants depuis votre profil.
          </Text>
        </View>
        <PrimaryButton title="Aller à la connexion" onPress={() => router.replace('/login')} />
      </SignupShell>
    );
  }

  if (step === 1) {
    return (
      <SignupShell
        step={1}
        total={TOTAL}
        eyebrow="PARENT / TUTEUR"
        title="Vos coordonnées"
        subtitle="Le compte est à votre nom : vous suivrez ensuite le planning, les bilans et les paiements de vos enfants."
        onBack={back}
      >
        <View style={s.gap}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Prénom *" placeholder="Sophie" value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Nom *" placeholder="Martin" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
            </View>
          </View>
          <PhoneField
            label="Téléphone *"
            country={country}
            onCountryChange={(iso) => {
              setCountry(iso);
              setPostalCode('');
              setCity('');
            }}
            value={phone}
            onChangeText={setPhone}
          />
          <PostalCityFields
            country={country}
            postalCode={postalCode}
            city={city}
            onChange={(v) => {
              setPostalCode(v.postalCode);
              setCity(v.city);
            }}
          />
        </View>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <PrimaryButton title="Continuer" onPress={nextFromContact} />
      </SignupShell>
    );
  }

  return (
    <SignupShell step={2} total={TOTAL} eyebrow="PARENT / TUTEUR" title="Vos identifiants" onBack={back}>
      <View style={s.gap}>
        <Field
          label="Adresse e-mail *"
          placeholder="sophie.martin@exemple.fr"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Mot de passe *"
          placeholder="8 caractères minimum"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.muted} />
            </Pressable>
          }
        />
        <Field
          label="Confirmer le mot de passe *"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          value={confirm}
          onChangeText={setConfirm}
        />
      </View>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <PrimaryButton title="Créer mon compte parent" onPress={submit} loading={sending} />
    </SignupShell>
  );
}

const styles = StyleSheet.create({
  done: { borderRadius: radius.lg, padding: 20, alignItems: 'center', gap: 12 },
});
