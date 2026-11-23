import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckChip, CONTACT_EMAIL, GroupLabel, SignupShell, signupStyles as s } from '@/components/signup';
import { PhoneField } from '@/components/CountryFields';
import { Field, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isValidPhone, phoneFromStore, phoneToStore } from '@/lib/country';
import { radius, typography as t, useColors } from '@/theme';

/**
 * Maquette Figma « ☎️ Aide & contact » :
 * accueil (téléphone, e-mail) → « Rappelez-moi » ou « Demandez un devis » → confirmation.
 * Mêmes envois que le site (rappel : nom, téléphone, message ; devis : classe, matières,
 * coordonnées, besoin). Les étapes de la maquette absentes du site (cours en visio,
 * jours de rappel) ne sont pas reprises.
 */

export const CONTACT_PHONE = '+33187667787';
const CONTACT_PHONE_LABEL = '+33 1 87 66 77 87';
const EMAIL = /^\S+@\S+\.\S+$/;
const BESOIN_MAX = 500;

type Screen = 'accueil' | 'rappel' | 'devis-niveau' | 'devis-contact' | 'rappel-ok' | 'devis-ok';

export default function AideContactScreen() {
  const c = useColors();
  const { user } = useAuth();
  const [screen, setScreen] = useState<Screen>('accueil');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [country, setCountry] = useState(() => phoneFromStore(user?.phone).country);
  const [phone, setPhone] = useState(() => phoneFromStore(user?.phone).national);
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [besoin, setBesoin] = useState('');

  const [niveau, setNiveau] = useState<string | null>(null);
  const [classeId, setClasseId] = useState<number | null>(null);
  const [matieres, setMatieres] = useState<number[]>([]);

  const devisOpen = screen === 'devis-niveau' || screen === 'devis-contact';
  const classes = useQuery({ queryKey: ['ref', 'classes'], queryFn: api.classes, staleTime: 3600_000, enabled: devisOpen });
  const niveaux = useMemo(() => {
    const map = new Map<string, { id: number; nom: string }[]>();
    for (const cl of classes.data ?? []) {
      const n = cl.niveau?.nom ?? 'Autres';
      map.set(n, [...(map.get(n) ?? []), { id: cl.id, nom: cl.nom }]);
    }
    return [...map.entries()];
  }, [classes.data]);
  const classesOfNiveau = niveaux.find(([n]) => n === niveau)?.[1] ?? [];
  const matieresQ = useQuery({
    queryKey: ['ref', 'matieres', classeId],
    queryFn: () => api.matieresOfClasse(classeId!),
    enabled: classeId != null,
    staleTime: 3600_000,
  });

  const go = (next: Screen) => {
    setError(null);
    setScreen(next);
  };
  const leave = () => (router.canGoBack() ? router.back() : router.replace(user ? '/profil' : '/login'));
  const backLabel = user ? 'Retour' : 'Retour à la connexion';
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const phoneOk = isValidPhone(country, phone);

  const sendRappel = async () => {
    if (!firstName.trim() || !lastName.trim()) return setError('Renseignez votre prénom et votre nom.');
    if (!phoneOk) return setError('Renseignez un numéro de téléphone valide.');
    setError(null);
    setSending(true);
    try {
      await api.rappel({ name: fullName, phone: phoneToStore(country, phone), message: message.trim() || undefined });
      go('rappel-ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La demande n’a pas pu aboutir.');
    } finally {
      setSending(false);
    }
  };

  const nextFromNiveau = () => {
    if (!classeId) return setError('Choisissez le niveau et la classe.');
    if (matieres.length === 0) return setError('Choisissez au moins une matière.');
    go('devis-contact');
  };

  const sendDevis = async () => {
    if (!firstName.trim() || !lastName.trim()) return setError('Renseignez votre prénom et votre nom.');
    if (!phoneOk) return setError('Renseignez un numéro de téléphone valide.');
    if (!EMAIL.test(email.trim())) return setError('Renseignez une adresse e-mail valide.');
    if (besoin.trim().length > BESOIN_MAX) return setError(`Votre besoin : ${BESOIN_MAX} caractères maximum.`);
    setError(null);
    setSending(true);
    try {
      const names = (matieresQ.data ?? []).filter((m) => matieres.includes(m.id)).map((m) => m.nom);
      await api.devis({
        name: fullName,
        email: email.trim().toLowerCase(),
        phone: phoneToStore(country, phone),
        countryCode: country,
        classId: classeId!,
        className: classesOfNiveau.find((cl) => cl.id === classeId)?.nom,
        matieres,
        matieresNoms: names,
        besoin: besoin.trim() || undefined,
      });
      go('devis-ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La demande n’a pas pu aboutir.');
    } finally {
      setSending(false);
    }
  };

  const privacy = (
    <View style={{ gap: 6 }}>
      <View style={styles.inline}>
        <Ionicons name="lock-closed-outline" size={14} color={c.muted} />
        <Text style={[t.captionRegular, { color: c.muted }]}>Vos données sont sécurisées et ne seront jamais partagées.</Text>
      </View>
      <Text style={[t.captionRegular, { color: c.muted }]}>
        En envoyant ce formulaire, vous acceptez d’être recontacté par e-Supadom au sujet de votre demande. Vos données sont traitées conformément à notre politique de confidentialité.
      </Text>
    </View>
  );

  // ─── Confirmations ─────────────────────────────────────────────────────
  if (screen === 'rappel-ok' || screen === 'devis-ok') {
    return (
      <SignupShell
        hideHelp
        icon="checkmark"
        iconTone="success"
        eyebrow="MERCI POUR VOTRE CONFIANCE."
        title="Demande confirmée !"
        subtitle="Notre conseillère pédagogique a bien reçu votre demande et vous contactera très prochainement."
        onBack={leave}
        backLabel={backLabel}
      >
        {screen === 'devis-ok' ? (
          <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
            <Text style={[t.cardTitle, { color: c.text }]}>Préparez vos objectifs</Text>
            <Text style={[t.cardText, { color: c.muted }]}>
              Matières ciblées (Maths, Français, Méthodologie…), niveau de classe et échéances proches (Brevet, Bac, Concours).
            </Text>
          </View>
        ) : null}
        <PrimaryButton title={user ? 'Retour' : 'Retour à la connexion'} onPress={leave} />
      </SignupShell>
    );
  }

  // ─── Rappelez-moi ──────────────────────────────────────────────────────
  if (screen === 'rappel') {
    return (
      <SignupShell hideHelp title="Être rappelé par notre conseillère" onBack={() => go('accueil')} backLabel="Nous contacter">
        <View style={s.gap}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Prénom *" placeholder="Camille" value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Nom *" placeholder="Martin" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
            </View>
          </View>
          <PhoneField label="Téléphone *" country={country} onCountryChange={setCountry} value={phone} onChangeText={setPhone} />
          <Field
            label="Quand vous rappeler ?"
            placeholder="Ex. : en semaine après 18h"
            value={message}
            onChangeText={setMessage}
            multiline
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
        </View>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <PrimaryButton title="Envoyer" onPress={() => void sendRappel()} loading={sending} />
        {privacy}
      </SignupShell>
    );
  }

  // ─── Devis 1/2 : niveau et matières ────────────────────────────────────
  if (screen === 'devis-niveau') {
    return (
      <SignupShell
        hideHelp
        step={1}
        total={2}
        title="Réservez votre cours d’essai offert"
        subtitle="Précisez le niveau d’études et les matières."
        onBack={() => go('accueil')}
        backLabel="Nous contacter"
      >
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
              <GroupLabel>Niveau d’études *</GroupLabel>
              <View style={s.wrap}>
                {niveaux.map(([n]) => (
                  <CheckChip key={n} label={n} selected={niveau === n} onPress={() => { setNiveau(n); setClasseId(null); setMatieres([]); }} />
                ))}
              </View>
            </View>
            {niveau ? (
              <View style={{ gap: 8 }}>
                <GroupLabel>Classe *</GroupLabel>
                <View style={s.wrap}>
                  {classesOfNiveau.map((cl) => (
                    <CheckChip key={cl.id} label={cl.nom} selected={classeId === cl.id} onPress={() => { setClasseId(cl.id); setMatieres([]); }} />
                  ))}
                </View>
              </View>
            ) : null}
            <View style={{ gap: 8 }}>
              <GroupLabel>Matière(s) * · choix multiple possible</GroupLabel>
              {!classeId ? (
                <Text style={[t.captionRegular, { color: c.muted }]}>Renseignez d’abord le niveau d’études.</Text>
              ) : matieresQ.isLoading ? (
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
          </View>
        )}
        {error ? <Notice kind="error">{error}</Notice> : null}
        <PrimaryButton title="Continuer" onPress={nextFromNiveau} />
        {privacy}
      </SignupShell>
    );
  }

  // ─── Devis 2/2 : coordonnées ───────────────────────────────────────────
  if (screen === 'devis-contact') {
    return (
      <SignupShell hideHelp step={2} total={2} title="Vos coordonnées" onBack={() => go('devis-niveau')} backLabel="Précédent">
        <View style={s.gap}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Prénom *" placeholder="Camille" value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Nom *" placeholder="Martin" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
            </View>
          </View>
          <PhoneField label="Téléphone *" country={country} onCountryChange={setCountry} value={phone} onChangeText={setPhone} />
          <Field
            label="E-mail *"
            placeholder="camille@exemple.fr"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Votre besoin (optionnel)"
            placeholder="Décrivez votre besoin"
            value={besoin}
            onChangeText={setBesoin}
            maxLength={BESOIN_MAX}
            multiline
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />
        </View>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <PrimaryButton title="Je demande mon 1er cours d’essai offert" onPress={() => void sendDevis()} loading={sending} />
        {privacy}
      </SignupShell>
    );
  }

  // ─── Accueil « Nous contacter » ────────────────────────────────────────
  return (
    <SignupShell
      hideHelp
      title="Nous contacter"
      subtitle="Notre équipe pédagogique est à votre écoute pour vous accompagner."
      onBack={leave}
      backLabel={backLabel}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Appeler e-Supadom au ${CONTACT_PHONE_LABEL}`}
        onPress={() => Linking.openURL(`tel:${CONTACT_PHONE}`)}
        style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}
      >
        <View style={styles.cardHead}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[t.cardTitle, { color: c.text }]}>Par téléphone</Text>
            <Text style={[t.cardText, { color: c.link }]}>{CONTACT_PHONE_LABEL}</Text>
          </View>
          <Text style={[t.caption, { color: c.link }]}>Appeler</Text>
          <Ionicons name="call-outline" size={18} color={c.link} />
        </View>
        <Text style={[t.captionRegular, { color: c.muted }]}>
          Horaires d’ouverture :{'\n'}• Du lundi au vendredi : 10h – 19h{'\n'}• Le samedi : 10h – 13h
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Écrire à ${CONTACT_EMAIL}`}
        onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
        style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}
      >
        <View style={styles.cardHead}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[t.cardTitle, { color: c.text }]}>Par e-mail</Text>
            <Text style={[t.cardText, { color: c.link }]}>{CONTACT_EMAIL}</Text>
          </View>
          <Text style={[t.caption, { color: c.link }]}>Écrire</Text>
          <Ionicons name="mail-outline" size={18} color={c.link} />
        </View>
      </Pressable>

      <PrimaryButton title="Rappelez-moi" icon="call" onPress={() => go('rappel')} />
      <SecondaryButton title="Demandez un devis" icon={<Ionicons name="document-text-outline" size={16} color={c.link} />} onPress={() => go('devis-niveau')} />

      {!user ? (
        <Pressable accessibilityRole="link" onPress={() => router.replace('/login')} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text style={[t.cardText, { color: c.muted }]}>
            Déjà inscrit ? <Text style={{ color: c.link, textDecorationLine: 'underline' }}>Se connecter</Text>
          </Text>
        </Pressable>
      ) : null}
    </SignupShell>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
