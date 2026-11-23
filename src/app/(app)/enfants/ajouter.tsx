import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AccountScreen } from '@/components/AccountScreen';
import { Chip, Section } from '@/components/forms';
import { CheckChip, RadioRow, signupStyles as s } from '@/components/signup';
import { Field, Notice, PrimaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { CHILDREN_KEY, parseFrDate, RELATIONS } from '@/lib/parent';
import { fonts, radius, typography as t, useColors } from '@/theme';
import type { ParentRelation } from '@/types';

/**
 * Maquette Figma « Ajouter un élève » (Profil · Élève & Parent) et parcours P2 :
 *   A. créer le profil de l'enfant : il reçoit un lien d'activation, sa référence est créée à l'activation ;
 *   B. inviter un élève déjà inscrit par e-mail (il accepte depuis son app).
 * Établissement scolaire et rythme hebdomadaire de la maquette ne sont pas repris (absents du site).
 */

type Mode = 'creer' | 'inviter';
const EMAIL = /^\S+@\S+\.\S+$/;

export default function AddChildScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('creer');
  const [relation, setRelation] = useState<ParentRelation>('MERE');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ kind: 'creer' | 'inviter'; email: string } | null>(null);
  const [sending, setSending] = useState(false);

  // A. Créer le profil
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [dob, setDob] = useState('');
  const [niveau, setNiveau] = useState<string | null>(null);
  const [classeId, setClasseId] = useState<number | null>(null);
  const [matieres, setMatieres] = useState<number[]>([]);

  // B. Inviter
  const [inviteEmail, setInviteEmail] = useState('');

  const classes = useQuery({ queryKey: ['ref', 'classes'], queryFn: api.classes, staleTime: 3600_000, enabled: mode === 'creer' });
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

  const toggleMatiere = (id: number) => setMatieres((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  const submit = async () => {
    setError(null);
    if (mode === 'creer') {
      if (!firstName.trim() || !lastName.trim()) return setError('Renseignez le prénom et le nom de votre enfant.');
      if (!childEmail.trim()) return setError('Renseignez l’adresse e-mail de votre enfant : il recevra un lien pour activer son compte.');
      if (!EMAIL.test(childEmail.trim())) return setError('L’adresse e-mail de l’enfant est invalide.');
      if (parseFrDate(dob) === 'invalid') return setError('Date de naissance invalide (format JJ/MM/AAAA).');
      if (!classeId) return setError('Choisissez le niveau et la classe.');
      if (matieres.length === 0) return setError('Choisissez au moins une matière.');
    } else if (!EMAIL.test(inviteEmail.trim())) {
      return setError('Renseignez l’adresse e-mail du compte élève.');
    }
    setSending(true);
    try {
      if (mode === 'creer') {
        const names = (matieresQ.data ?? []).filter((m) => matieres.includes(m.id)).map((m) => m.nom);
        await api.createChild({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: childEmail.trim().toLowerCase(),
          dob: (parseFrDate(dob) as string | null) ?? undefined,
          classe: classeId!,
          classeName: classesOfNiveau.find((cl) => cl.id === classeId)?.nom,
          matieres,
          matiereNames: names.join(', '),
          relation,
        });
        setDone({ kind: 'creer', email: childEmail.trim().toLowerCase() });
      } else {
        await api.inviteChild(inviteEmail.trim().toLowerCase(), relation);
        setDone({ kind: 'inviter', email: inviteEmail.trim().toLowerCase() });
      }
      await qc.invalidateQueries({ queryKey: CHILDREN_KEY });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’ajout n’a pas pu aboutir.');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    // Maquette « Merci pour votre intérêt · Votre demande d’activation a été envoyée avec succès »
    return (
      <AccountScreen title={done.kind === 'creer' ? 'Votre demande d’activation a été envoyée avec succès' : 'Demande envoyée'} subtitle="MERCI POUR VOTRE INTÉRÊT">
        <View style={[styles.ok, { backgroundColor: c.accentSoft }]}>
          <Ionicons name="checkmark" size={24} color={c.onAccent} />
        </View>
        <View style={[styles.mailBox, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Text style={[t.caption, { color: c.text }]}>E-mail</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            {done.kind === 'creer' ? (
              <>
                Un lien d’activation a été envoyé à <Text style={{ fontFamily: fonts.semibold, color: c.text }}>{done.email}</Text>. Votre enfant clique sur ce lien pour activer son compte : son identifiant élève est créé à ce moment-là, puis il peut se connecter.
              </>
            ) : (
              <>
                <Text style={{ fontFamily: fonts.semibold, color: c.text }}>{done.email}</Text> doit accepter votre demande depuis son application (valable 7 jours).
              </>
            )}
          </Text>
        </View>
        <PrimaryButton title="Retour à mon profil" icon="arrow-forward" onPress={() => (router.canGoBack() ? router.back() : router.replace('/profil'))} />
      </AccountScreen>
    );
  }

  return (
    <AccountScreen title="Ajouter un élève" subtitle="Ajoutez un enfant pour organiser ses cours particuliers et suivre ses progrès académiques.">
      <View style={[styles.head, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.photo, { backgroundColor: c.surfaceAlt }]}>
          <Ionicons name="person-add-outline" size={26} color={c.primary} />
        </View>
        <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
          <Text style={[t.captionRegular, { color: c.onAccent, fontFamily: fonts.semibold }]}>Nouveau</Text>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <RadioRow
          label="Créer le profil de mon enfant"
          hint="Il n’a pas encore de compte e-Supadom."
          selected={mode === 'creer'}
          onPress={() => setMode('creer')}
        />
        <RadioRow
          label="Mon enfant a déjà un compte"
          hint="Il recevra une demande à accepter dans son application."
          selected={mode === 'inviter'}
          onPress={() => setMode('inviter')}
        />
      </View>

      <Section title="Votre lien avec l’enfant">
        <View style={s.wrap}>
          {RELATIONS.map((r) => (
            <Chip key={r.value} label={r.label} selected={relation === r.value} onPress={() => setRelation(r.value)} />
          ))}
        </View>
      </Section>

      {mode === 'creer' ? (
        <>
          <Section title="Informations personnelles">
            <View style={s.gap}>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Field label="Prénom *" placeholder="Clara" value={firstName} onChangeText={setFirstName} autoComplete="off" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Nom *" placeholder="Martin" value={lastName} onChangeText={setLastName} autoComplete="off" />
                </View>
              </View>
              <Field
                label="Son adresse e-mail *"
                placeholder="clara@exemple.fr"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="off"
                value={childEmail}
                onChangeText={setChildEmail}
              />
              <Field label="Date de naissance" placeholder="JJ/MM/AAAA" keyboardType="numbers-and-punctuation" value={dob} onChangeText={setDob} />
            </View>
          </Section>

          <Section title="Niveau scolaire & Spécialités" subtitle="Classe actuelle et matières à travailler.">
            {classes.isLoading ? <ActivityIndicator color={c.primary} /> : null}
            <View style={s.wrap}>
              {niveaux.map(([n]) => (
                <Chip
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
            {niveau ? (
              <View style={s.wrap}>
                {classesOfNiveau.map((cl) => (
                  <Chip
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
            ) : null}
            {classeId ? (
              matieresQ.isLoading ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <View style={s.wrap}>
                  {(matieresQ.data ?? []).map((m) => (
                    <CheckChip key={m.id} label={m.nom} selected={matieres.includes(m.id)} onPress={() => toggleMatiere(m.id)} />
                  ))}
                </View>
              )
            ) : null}
          </Section>
        </>
      ) : (
        <Section title="Son compte élève">
          <Field
            label="Adresse e-mail du compte élève *"
            placeholder="thomas@exemple.fr"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="off"
            value={inviteEmail}
            onChangeText={setInviteEmail}
          />
          <Text style={[t.captionRegular, { color: c.muted }]}>
            Vous verrez son planning et ses bilans dès qu’il aura accepté.
          </Text>
        </Section>
      )}

      {error ? <Notice kind="error">{error}</Notice> : null}
      <PrimaryButton title={mode === 'creer' ? 'Ajouter mon enfant' : 'Envoyer la demande'} onPress={submit} loading={sending} />
    </AccountScreen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radius.lg, padding: 18 },
  photo: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  ok: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mailBox: { borderWidth: 1, borderRadius: radius.md, padding: 14, gap: 6 },
});
