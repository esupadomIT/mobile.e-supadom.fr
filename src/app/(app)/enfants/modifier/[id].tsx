import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AccountScreen } from '@/components/AccountScreen';
import { Avatar } from '@/components/Avatar';
import { Section } from '@/components/forms';
import { CheckChip, signupStyles as s } from '@/components/signup';
import { Field, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { CHILDREN_KEY, childKey, formatFrDate, parseFrDate, sinceLabel, useChildOverview } from '@/lib/parent';
import { radius, typography as t, useColors } from '@/theme';

/**
 * Maquette Figma « Modifier le profil Clara » (Profil · Élève & Parent) : le parent modifie
 * le profil d'un enfant qu'il a créé. Établissement scolaire et rythme hebdomadaire de la
 * maquette ne sont pas repris (absents du site).
 */
export default function EditChildScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = Number(id) || null;
  const overview = useChildOverview(studentId);
  const child = overview.data?.child;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [niveau, setNiveau] = useState<string | null>(null);
  const [classeId, setClasseId] = useState<number | null>(null);
  const [matieres, setMatieres] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);

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
  const matieresQ = useQuery({
    queryKey: ['ref', 'matieres', classeId],
    queryFn: () => api.matieresOfClasse(classeId!),
    enabled: classeId != null,
    staleTime: 3600_000,
  });

  // Pré-remplissage une fois le profil et les classes chargés
  useEffect(() => {
    if (ready || !child || !classes.data) return;
    setFirstName(child.firstName ?? '');
    setLastName(child.lastName ?? '');
    setDob(formatFrDate(child.dob));
    setPhone(child.phone ?? '');
    const cl = classes.data.find((x) => x.id === child.classe?.id);
    setNiveau(cl?.niveau?.nom ?? child.classe?.niveau ?? null);
    setClasseId(child.classe?.id ?? null);
    setMatieres((child.matieres ?? []).map((m) => m.id));
    setReady(true);
  }, [child, classes.data, ready]);

  const save = async () => {
    setSaved(false);
    if (!firstName.trim() || !lastName.trim()) return setError('Renseignez le prénom et le nom.');
    const iso = parseFrDate(dob);
    if (iso === 'invalid') return setError('Date de naissance invalide (format JJ/MM/AAAA).');
    if (phone.trim() && phone.replace(/\D/g, '').length < 9) return setError('Numéro de téléphone invalide.');
    if (!classeId) return setError('Choisissez la classe actuelle.');
    if (matieres.length === 0) return setError('Choisissez au moins une matière.');
    setError(null);
    setSending(true);
    try {
      await api.updateChildProfile(studentId!, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob: iso,
        phone: phone.trim() || null,
        classe: classeId,
        matieres,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: childKey(studentId!) }),
        qc.invalidateQueries({ queryKey: CHILDREN_KEY }),
      ]);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’enregistrement n’a pas pu aboutir.');
    } finally {
      setSending(false);
    }
  };

  if (overview.isLoading || !studentId) {
    return (
      <AccountScreen title="Modifier le profil" subtitle="Espace parent">
        <ActivityIndicator color={c.primary} />
      </AccountScreen>
    );
  }
  if (overview.error || !child) {
    return (
      <AccountScreen title="Modifier le profil" subtitle="Espace parent">
        <Notice kind="error">{overview.error instanceof Error ? overview.error.message : 'Ce profil n’est pas disponible.'}</Notice>
        <SecondaryButton title="Réessayer" onPress={() => void overview.refetch()} />
      </AccountScreen>
    );
  }
  if (!child.managedByParent) {
    return (
      <AccountScreen title={`Modifier le profil ${child.firstName}`} subtitle="Espace parent">
        <Notice kind="error">{child.firstName} gère son propre compte : lui seul peut modifier son profil depuis son application.</Notice>
        <SecondaryButton title="Retour" onPress={() => router.back()} />
      </AccountScreen>
    );
  }

  const since = sinceLabel(child.createdAt);
  return (
    <AccountScreen title={`Modifier le profil ${child.firstName}`} subtitle="Espace parent">
      <View style={[styles.head, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Avatar person={{ id: studentId, firstName: child.firstName, lastName: child.lastName, role: 'STUDENT', profilePicture: child.profilePicture }} size={72} />
        <Text style={[t.cardTitle, { color: c.text, fontSize: 18 }]}>
          {child.firstName} {child.lastName}
        </Text>
        <Text style={[t.captionRegular, { color: c.muted, textAlign: 'center' }]}>
          {[since, child.classe?.nom].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <Section title="Informations personnelles">
        <View style={s.gap}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Prénom *" value={firstName} onChangeText={setFirstName} autoComplete="off" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Nom *" value={lastName} onChangeText={setLastName} autoComplete="off" />
            </View>
          </View>
          <Field label="Date de naissance" placeholder="JJ/MM/AAAA" keyboardType="numbers-and-punctuation" value={dob} onChangeText={setDob} />
          <Field label="Téléphone" placeholder="06 12 34 56 78" keyboardType="phone-pad" autoComplete="off" value={phone} onChangeText={setPhone} />
        </View>
      </Section>

      <Section title="Niveau scolaire & Spécialités">
        {classes.isLoading ? <ActivityIndicator color={c.primary} /> : null}
        <Text style={[t.caption, { color: c.text }]}>Classe actuelle *</Text>
        <View style={s.wrap}>
          {niveaux.map(([n]) => (
            <CheckChip key={n} label={n} selected={niveau === n} onPress={() => { setNiveau(n); setClasseId(null); setMatieres([]); }} />
          ))}
        </View>
        {niveau ? (
          <View style={s.wrap}>
            {classesOfNiveau.map((cl) => (
              <CheckChip key={cl.id} label={cl.nom} selected={classeId === cl.id} onPress={() => { setClasseId(cl.id); setMatieres([]); }} />
            ))}
          </View>
        ) : null}
        {classeId ? (
          <>
            <Text style={[t.caption, { color: c.text }]}>
              Matières{matieres.length ? ` (${matieres.length} ajoutée${matieres.length > 1 ? 's' : ''})` : ''} *
            </Text>
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
          </>
        ) : null}
      </Section>

      {error ? <Notice kind="error">{error}</Notice> : null}
      {saved ? <Notice kind="success">Les modifications sont enregistrées.</Notice> : null}
      <PrimaryButton title="Enregistrer les modifications" icon="arrow-forward" onPress={() => void save()} loading={sending} />
    </AccountScreen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.lg, padding: 18 },
});
