import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckChip, GroupLabel, RadioRow, SignupShell, signupStyles as s } from '@/components/signup';
import { Field, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { savePendingAvailability } from '@/lib/pendingAvailability';
import { radius, typography as t, useColors } from '@/theme';

/**
 * Maquettes Figma « 🔑 Sign up - Log in - Élève / Parent » :
 * « Un compte pour apprendre » → coordonnées → niveau → logins → e-mail d'activation.
 * Les disponibilités (« Le bon rythme pour vous ») sont demandées à la première connexion.
 */

type Role = 'eleve' | 'parent';
const TOTAL = 4;

/** « Le bon rythme pour vous » : jours (0 = dimanche) et plages proposées. */
const JOURS = [
  { d: '1', label: 'Lun' }, { d: '2', label: 'Mar' }, { d: '3', label: 'Mer' }, { d: '4', label: 'Jeu' },
  { d: '5', label: 'Ven' }, { d: '6', label: 'Sam' }, { d: '0', label: 'Dim' },
];
const PLAGES = [
  { id: 'matin', label: 'Matin · 9h–12h', start: '09:00', end: '12:00' },
  { id: 'aprem', label: 'Après-midi · 14h–18h', start: '14:00', end: '18:00' },
  { id: 'soir', label: 'Soir · 18h–21h', start: '18:00', end: '21:00' },
];
const EMAIL = /^\S+@\S+\.\S+$/;

export default function StudentSignupScreen() {
  const c = useColors();
  const [step, setStep] = useState(0); // 0 = rôle, 1..3 = étapes, 4 = envoyé
  const [role, setRole] = useState<Role>('eleve');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [niveau, setNiveau] = useState<string | null>(null);
  const [classeId, setClasseId] = useState<number | null>(null);
  const [matieres, setMatieres] = useState<number[]>([]);

  const [jours, setJours] = useState<string[]>([]);
  const [plages, setPlages] = useState<string[]>([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const classes = useQuery({ queryKey: ['ref', 'classes'], queryFn: api.classes, staleTime: 3600_000 });
  const niveaux = useMemo(() => {
    const map = new Map<string, { id: number; nom: string }[]>();
    for (const cl of classes.data ?? []) {
      const n = cl.niveau?.nom ?? 'Autres';
      map.set(n, [...(map.get(n) ?? []), { id: cl.id, nom: cl.nom }]);
    }
    return [...map.entries()];
  }, [classes.data]);
  const classesOfNiveau = niveaux.find(([n]) => n === niveau)?.[1] ?? [];
  const classe = classesOfNiveau.find((cl) => cl.id === classeId);

  const matieresQ = useQuery({
    queryKey: ['ref', 'matieres', classeId],
    queryFn: () => api.matieresOfClasse(classeId!),
    enabled: classeId != null,
    staleTime: 3600_000,
  });

  const isParent = role === 'parent';
  const go = (next: number) => {
    setError(null);
    setStep(next);
  };
  const back = () => (step === 0 ? (router.canGoBack() ? router.back() : router.replace('/inscription')) : go(step - 1));

  const nextFromContact = () => {
    if (!firstName.trim() || !lastName.trim()) return setError('Renseignez le prénom et le nom.');
    if (phone.replace(/\D/g, '').length < 9) return setError('Renseignez un numéro de téléphone valide.');
    if (!city.trim()) return setError('Renseignez la ville.');
    if (!/^\d{4,10}$/.test(postalCode.trim())) return setError('Renseignez un code postal valide.');
    go(2);
  };

  const nextFromLevel = () => {
    if (!classeId) return setError('Choisissez le niveau et la classe.');
    if (matieres.length === 0) return setError('Choisissez au moins une matière.');
    go(3);
  };

  const submit = async () => {
    if (!EMAIL.test(email.trim())) return setError('Renseignez une adresse e-mail valide.');
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (password !== confirm) return setError('Les deux mots de passe ne correspondent pas.');
    setError(null);
    setSending(true);
    try {
      const mail = email.trim().toLowerCase();
      const names = (matieresQ.data ?? []).filter((m) => matieres.includes(m.id)).map((m) => m.nom);
      await api.signupStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        phoneParent: isParent ? phone.trim() : undefined,
        city: city.trim(),
        postalCode: postalCode.trim(),
        email: mail,
        emailParent: isParent ? mail : undefined,
        password,
        classe: classeId!,
        classeName: classe?.nom,
        matieres,
        matiereNames: names.join(', '),
      });
      if (jours.length && plages.length) {
        const chosen = PLAGES.filter((p) => plages.includes(p.id)).map(({ start, end }) => ({ start, end }));
        await savePendingAvailability(mail, Object.fromEntries(jours.map((d) => [d, chosen])));
      }
      go(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’inscription n’a pas pu aboutir.');
    } finally {
      setSending(false);
    }
  };

  // ─── Étape 0 : rôle ────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <SignupShell eyebrow="BIENVENUE CHEZ E-SUPADOM" title="Un compte pour apprendre" subtitle="Choisissez votre rôle." onBack={back} backLabel="Retour">
        <View style={{ gap: 12 }}>
          <RadioRow label="Je suis élève" hint="Je choisis mes matières et mes cours." selected={role === 'eleve'} onPress={() => setRole('eleve')} />
          <RadioRow label="Je suis parent / tuteur" hint="Je gère le suivi, le planning et les cours de mes enfants." selected={role === 'parent'} onPress={() => setRole('parent')} />
        </View>
        <PrimaryButton
          title={isParent ? 'Continuer comme parent' : 'Continuer comme élève'}
          // Parent / tuteur : compte PARENT à son nom (enfants ajoutés après connexion)
          onPress={() => (isParent ? router.push('/inscription/parent') : go(1))}
        />
        <Pressable accessibilityRole="link" onPress={() => router.replace('/login')} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text style={[t.cardText, { color: c.muted }]}>
            Déjà inscrit ? <Text style={{ color: c.link, textDecorationLine: 'underline' }}>Se connecter</Text>
          </Text>
        </Pressable>
      </SignupShell>
    );
  }

  // ─── Envoyé ────────────────────────────────────────────────────────────
  if (step === 5) {
    return (
      <SignupShell eyebrow="BIENVENUE CHEZ E-SUPADOM" title="Vérifiez vos e-mails" onBack={() => router.replace('/login')}>
        <View style={[styles.done, { backgroundColor: c.accentSoft }]}>
          <Ionicons name="mail-unread-outline" size={30} color={c.onAccent} />
          <Text style={[t.body, { color: c.text, textAlign: 'center' }]}>
            Nous avons envoyé un lien d’activation à{'\n'}
            <Text style={{ fontWeight: '700' }}>{email.trim().toLowerCase()}</Text>
          </Text>
          <Text style={[t.cardText, { color: c.muted, textAlign: 'center' }]}>
            Cliquez sur le lien pour activer le compte, puis connectez-vous. Pensez à vérifier les courriers indésirables.
          </Text>
        </View>
        <PrimaryButton title="Aller à la connexion" onPress={() => router.replace('/login')} />
      </SignupShell>
    );
  }

  // ─── Étape 1 : coordonnées ─────────────────────────────────────────────
  if (step === 1) {
    return (
      <SignupShell step={1} total={TOTAL} title={isParent ? 'Les coordonnées de l’élève' : 'Vos coordonnées'} subtitle={isParent ? 'Le compte est au nom de votre enfant.' : undefined} onBack={back}>
        <View style={s.gap}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Prénom *" placeholder="Camille" value={firstName} onChangeText={setFirstName} autoComplete={isParent ? 'off' : 'given-name'} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Nom *" placeholder="Martin" value={lastName} onChangeText={setLastName} autoComplete={isParent ? 'off' : 'family-name'} />
            </View>
          </View>
          <Field label={isParent ? 'Votre téléphone *' : 'Téléphone *'} placeholder="06 12 34 56 78" keyboardType="phone-pad" autoComplete="tel" value={phone} onChangeText={setPhone} />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Ville *" placeholder="Lyon" value={city} onChangeText={setCity} autoComplete="postal-address-locality" />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Code postal *"
                placeholder="69001"
                keyboardType="number-pad"
                value={postalCode}
                onChangeText={(v) => {
                  setPostalCode(v);
                  if (/^\d{5}$/.test(v) && !city.trim()) void api.cityOf(v).then((found) => found && setCity(found));
                }}
              />
            </View>
          </View>
        </View>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <PrimaryButton title="Continuer" onPress={nextFromContact} />
      </SignupShell>
    );
  }

  // ─── Étape 2 : niveau ──────────────────────────────────────────────────
  if (step === 2) {
    return (
      <SignupShell step={2} total={TOTAL} title={isParent ? 'Le niveau de l’élève' : 'Votre niveau'} subtitle="Nous adaptons les cours et les tarifs à la classe." onBack={back}>
        {classes.isLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : classes.isError ? (
          <View style={{ gap: 12 }}>
            <Notice kind="error">Impossible de charger les classes.</Notice>
            <SecondaryButton title="Réessayer" onPress={() => void classes.refetch()} />
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            <View style={{ gap: 8 }}>
              <GroupLabel>Niveau *</GroupLabel>
              <View style={s.wrap}>
                {niveaux.map(([n]) => (
                  <CheckChip
                    key={n}
                    label={n}
                    selected={niveau === n}
                    onPress={() => {
                      setNiveau(n);
                      setClasseId(null);
                      setMatieres([]);
                    }}
                  />
                ))}
              </View>
            </View>

            {niveau ? (
              <View style={{ gap: 8 }}>
                <GroupLabel>Classe *</GroupLabel>
                <View style={s.wrap}>
                  {classesOfNiveau.map((cl) => (
                    <CheckChip
                      key={cl.id}
                      label={cl.nom}
                      selected={classeId === cl.id}
                      onPress={() => {
                        setClasseId(cl.id);
                        setMatieres([]);
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {classeId ? (
              <View style={{ gap: 8 }}>
                <GroupLabel>
                  Matières{matieres.length ? ` (${matieres.length} ajoutée${matieres.length > 1 ? 's' : ''})` : ''} *
                </GroupLabel>
                {matieresQ.isLoading ? (
                  <ActivityIndicator color={c.primary} />
                ) : (
                  <View style={s.wrap}>
                    {(matieresQ.data ?? []).map((m) => (
                      <CheckChip
                        key={m.id}
                        label={m.nom}
                        selected={matieres.includes(m.id)}
                        onPress={() => setMatieres((old) => (old.includes(m.id) ? old.filter((x) => x !== m.id) : [...old, m.id]))}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </View>
        )}
        {error ? <Notice kind="error">{error}</Notice> : null}
        <PrimaryButton title="Continuer" onPress={nextFromLevel} />
      </SignupShell>
    );
  }

  // ─── Étape 3 : le bon rythme ───────────────────────────────────────────
  if (step === 3) {
    const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    return (
      <SignupShell
        step={3}
        total={TOTAL}
        title="Le bon rythme pour vous"
        subtitle="Quand êtes-vous disponible pour vos cours ? Vous pourrez l’ajuster ensuite dans votre planning."
        onBack={back}
      >
        <View style={{ gap: 8 }}>
          <GroupLabel>Jours</GroupLabel>
          <View style={s.wrap}>
            {JOURS.map((j) => (
              <CheckChip key={j.d} label={j.label} selected={jours.includes(j.d)} onPress={() => setJours((old) => toggle(old, j.d))} />
            ))}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <GroupLabel>Plages horaires</GroupLabel>
          <View style={s.wrap}>
            {PLAGES.map((p) => (
              <CheckChip key={p.id} label={p.label} selected={plages.includes(p.id)} onPress={() => setPlages((old) => toggle(old, p.id))} />
            ))}
          </View>
        </View>
        <Text style={[t.captionRegular, { color: c.muted }]}>Les cours ont lieu en visio (Google Meet).</Text>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <PrimaryButton
          title="Continuer"
          onPress={() => (jours.length && !plages.length ? setError('Choisissez au moins une plage horaire.') : go(4))}
        />
        <Pressable accessibilityRole="button" onPress={() => { setJours([]); setPlages([]); go(4); }} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text style={[t.caption, { color: c.link, fontSize: 13 }]}>Passer cette étape</Text>
        </Pressable>
      </SignupShell>
    );
  }

  // ─── Étape 4 : logins ──────────────────────────────────────────────────
  return (
    <SignupShell step={4} total={TOTAL} title="Vos identifiants" subtitle={isParent ? 'Utilisez votre adresse e-mail : vous recevrez le suivi et les factures.' : 'Ils vous serviront à vous connecter.'} onBack={back}>
      <View style={s.gap}>
        <Field
          label="Adresse e-mail *"
          placeholder="camille.martin@exemple.fr"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Mot de passe *"
          placeholder="8 caractères minimum"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={c.link} />
            </Pressable>
          }
        />
        <Field
          label="Confirmer le mot de passe *"
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          value={confirm}
          onChangeText={setConfirm}
          onSubmitEditing={submit}
        />
      </View>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <PrimaryButton title="Créer mon compte" onPress={submit} loading={sending} />
    </SignupShell>
  );
}

const styles = StyleSheet.create({
  done: { borderRadius: radius.lg, padding: 22, alignItems: 'center', gap: 12 },
});
