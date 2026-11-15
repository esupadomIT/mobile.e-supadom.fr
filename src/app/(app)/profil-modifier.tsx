import { PasswordSection } from '@/components/PasswordSection';
import { AppHeader } from '@/components/AppHeader';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip, Section, SelectField } from '@/components/forms';
import { Field, Notice, PrimaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { FULL_USER_KEY, ME_KEY, useFullUser } from '@/lib/home';
import { useColors } from '@/theme';
import type { FullUser } from '@/types';

interface Form {
  gender: string;
  firstName: string;
  lastName: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  phone: string;
  postalCode: string;
  city: string;
  emailParent: string;
  parentPhone: string;
}

function toForm(u: FullUser): Form {
  const [y = '', m = '', d = ''] = u.dob ? u.dob.split('T')[0].split('-') : [];
  return {
    gender: u.gender ?? '',
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    dobDay: d,
    dobMonth: m,
    dobYear: y,
    phone: u.phone ?? '',
    postalCode: u.postalCode ?? '',
    city: u.city ?? '',
    emailParent: u.emailParent && u.emailParent !== u.email ? u.emailParent : '',
    parentPhone: u.phoneParent ?? '',
  };
}

function validDob(f: Form) {
  const d = parseInt(f.dobDay, 10);
  const m = parseInt(f.dobMonth, 10);
  const y = parseInt(f.dobYear, 10);
  if (!d || !m || !y || f.dobYear.length !== 4) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCDate() === d && date.getUTCMonth() === m - 1 && y > 1900 && date < new Date();
}

/** Modifier mon profil (élève ou prof), sans passer par le site. */
export default function EditProfileScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isInstructor = user?.role === 'INSTRUCTOR';
  const { data: full, isLoading, error: loadError } = useFullUser();

  const [form, setForm] = useState<Form | null>(null);
  const [classeId, setClasseId] = useState<string>('');
  const [matieres, setMatieres] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  if (full && !form) {
      setForm(toForm(full));
      setClasseId(String(full.userClasses?.[0]?.classe?.id ?? ''));
      setMatieres((full.matieres ?? []).map((m) => m.matiere.id));
  }

  const classes = useQuery({ queryKey: ['classes'], queryFn: api.classes, enabled: !isInstructor, staleTime: 3600_000 });
  const classeMatieres = useQuery({
    queryKey: ['classe-matieres', classeId],
    queryFn: () => api.matieresOfClasse(Number(classeId)),
    enabled: !isInstructor && !!classeId,
  });
  const classeOptions = useMemo(
    () => (classes.data ?? []).map((cl) => ({ value: String(cl.id), label: cl.niveau?.nom ? `${cl.nom} · ${cl.niveau.nom}` : cl.nom })),
    [classes.data],
  );

  const set = (k: keyof Form) => (v: string) => {
    setNotice(null);
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  const onPostalCode = async (v: string) => {
    if (!/^\d{0,5}$/.test(v)) return;
    set('postalCode')(v);
    if (v.length === 5) {
      const city = await api.cityOf(v);
      if (city) setForm((f) => (f ? { ...f, city } : f));
    }
  };

  const save = async () => {
    if (!form || !full) return;
    const missing: string[] = [];
    if (!form.gender) missing.push('civilité');
    if (!form.firstName.trim()) missing.push('prénom');
    if (!form.lastName.trim()) missing.push('nom');
    if (!validDob(form)) missing.push('date de naissance');
    if (!form.phone.trim()) missing.push('téléphone');
    if (form.postalCode.length !== 5) missing.push('code postal');
    if (!form.city.trim()) missing.push('ville');
    if (!isInstructor && !classeId) missing.push('classe');
    if (!isInstructor && matieres.length === 0) missing.push('matières');
    if (missing.length) return setNotice({ kind: 'error', text: `À compléter : ${missing.join(', ')}.` });

    const dob = `${form.dobYear}-${form.dobMonth.padStart(2, '0')}-${form.dobDay.padStart(2, '0')}`;
    const common = {
      id: full.id,
      gender: form.gender,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dob,
      phone: form.phone.trim(),
      postalCode: form.postalCode,
      city: form.city.trim(),
      email: full.email,
    };
    setSaving(true);
    try {
      if (isInstructor) {
        // classes / matières non envoyées : celles du prof restent inchangées
        await api.updateProfileInstructor(common);
      } else {
        await api.updateProfile({
          ...common,
          classeId: Number(classeId),
          matieres,
          emailParent: form.emailParent.trim() || null,
          parentPhone: form.parentPhone.trim() || null,
        });
      }
      await Promise.all([qc.invalidateQueries({ queryKey: ME_KEY }), qc.invalidateQueries({ queryKey: FULL_USER_KEY })]);
      router.back();
    } catch (e) {
      setNotice({ kind: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} /><AppHeader />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {isLoading || !form ? (
          <View style={styles.center}>
            {loadError ? <Notice kind="error">{(loadError as Error).message}</Notice> : <ActivityIndicator color={c.primary} />}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Section title="Identité">
              <Text style={[styles.label, { color: c.muted }]}>Civilité</Text>
              <View style={styles.wrap}>
                <Chip label="Femme" selected={form.gender === 'Female'} onPress={() => set('gender')('Female')} />
                <Chip label="Homme" selected={form.gender === 'Male'} onPress={() => set('gender')('Male')} />
              </View>
              <Field label="Prénom" value={form.firstName} onChangeText={set('firstName')} autoComplete="given-name" />
              <Field label="Nom" value={form.lastName} onChangeText={set('lastName')} autoComplete="family-name" />
              <Text style={[styles.label, { color: c.muted }]}>Date de naissance</Text>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Field label="Jour" value={form.dobDay} onChangeText={(v) => /^\d{0,2}$/.test(v) && set('dobDay')(v)} keyboardType="number-pad" placeholder="JJ" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Mois" value={form.dobMonth} onChangeText={(v) => /^\d{0,2}$/.test(v) && set('dobMonth')(v)} keyboardType="number-pad" placeholder="MM" />
                </View>
                <View style={{ flex: 1.4 }}>
                  <Field label="Année" value={form.dobYear} onChangeText={(v) => /^\d{0,4}$/.test(v) && set('dobYear')(v)} keyboardType="number-pad" placeholder="AAAA" />
                </View>
              </View>
            </Section>

            <Section title="Coordonnées">
              <Field label="E-mail (identifiant)" value={full?.email ?? ''} editable={false} style={{ color: c.muted }} />
              <Field label="Téléphone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Field label="Code postal" value={form.postalCode} onChangeText={onPostalCode} keyboardType="number-pad" maxLength={5} />
                </View>
                <View style={{ flex: 1.6 }}>
                  <Field label="Ville" value={form.city} onChangeText={set('city')} />
                </View>
              </View>
            </Section>

            {!isInstructor ? (
              <>
                <Section title="Parent" subtitle="Facultatif : si le compte est géré par un parent">
                  <Field label="E-mail du parent" value={form.emailParent} onChangeText={set('emailParent')} keyboardType="email-address" autoCapitalize="none" />
                  <Field label="Téléphone du parent" value={form.parentPhone} onChangeText={set('parentPhone')} keyboardType="phone-pad" />
                </Section>

                <Section title="Scolarité">
                  <SelectField
                    label="Classe"
                    value={classeId}
                    options={classeOptions}
                    placeholder={classes.isLoading ? 'Chargement…' : 'Choisir une classe'}
                    onChange={(v) => {
                      setNotice(null);
                      if (v !== classeId) setMatieres([]);
                      setClasseId(v);
                    }}
                  />
                  <Text style={[styles.label, { color: c.muted }]}>Matières</Text>
                  {classeMatieres.isLoading ? <ActivityIndicator color={c.primary} /> : null}
                  <View style={styles.wrap}>
                    {(classeMatieres.data ?? []).map((m) => (
                      <Chip
                        key={m.id}
                        label={m.nom}
                        selected={matieres.includes(m.id)}
                        onPress={() => setMatieres((list) => (list.includes(m.id) ? list.filter((x) => x !== m.id) : [...list, m.id]))}
                      />
                    ))}
                  </View>
                </Section>
              </>
            ) : (
              <Section title="Enseignement" subtitle="Classes et matières enseignées : à modifier avec l’équipe e-Supadom.">
                <Text style={{ color: c.text, lineHeight: 20 }}>
                  {(full?.userClasses ?? []).map((u) => u.classe.nom).join(', ') || 'Aucune classe'}
                </Text>
                {(full?.matieres ?? []).length ? (
                  <Text style={{ color: c.muted, lineHeight: 20 }}>{[...new Set((full?.matieres ?? []).map((m) => m.matiere.nom))].join(', ')}</Text>
                ) : null}
              </Section>
            )}

            {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}
            <PrimaryButton title="Enregistrer" onPress={save} loading={saving} />
            <PasswordSection userId={full?.id} social={!!full?.isSocialAuth} email={full?.email ?? ''} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  body: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 14, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  label: { fontSize: 13, fontWeight: '600' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
});
