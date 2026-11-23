import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SelectField } from '@/components/forms';
import { CheckChip, GroupLabel, RadioRow, SignupShell, signupStyles as s } from '@/components/signup';
import { PhoneField, PostalCityFields } from '@/components/CountryFields';
import { Card, Field, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { DEFAULT_COUNTRY, isValidPhone, phoneToStore, postalCityError } from '@/lib/country';
import type { CountryCode } from 'libphonenumber-js/min';
import {
  EDUCATION_LEVELS,
  JOURS,
  MATIERES_PAR_DOMAINE,
  NIVEAUX_ENSEIGNES,
  PLAGES,
  PROFESSIONAL_SITUATIONS,
  VOLUMES,
} from '@/lib/candidature';
import { fonts, radius, typography as t, useColors } from '@/theme';

/**
 * Maquettes Figma « 🔑 Sign up - Log in - Professeur » : « Transmettez votre savoir »,
 * candidature en 5 étapes, « Candidature envoyée ». Envoi : POST /api/postuler (comme le site).
 */

const TOTAL = 5;
const EMAIL = /^\S+@\S+\.\S+$/;
const CV_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];
const CV_MAX = 10 * 1024 * 1024;

type Cv = { uri: string; name: string; size?: number; mimeType?: string; file?: File };

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const kb = (n?: number) => (n ? (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo` : `${Math.round(n / 1024)} Ko`) : '');

export default function TeacherApplicationScreen() {
  const c = useColors();
  const [step, setStep] = useState(0); // 0 = intro, 1..5 = étapes, 6 = envoyée
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // 1 · Coordonnées
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  // 2 · Formation
  const [educationLevel, setEducationLevel] = useState('');
  const [diploma, setDiploma] = useState('');
  const [school, setSchool] = useState('');
  const [situation, setSituation] = useState('');
  // 3 · Enseignement
  const [niveaux, setNiveaux] = useState<string[]>([]);
  const [matieres, setMatieres] = useState<string[]>([]);
  const [autre, setAutre] = useState('');
  // 4 · Dates et horaires
  const [volume, setVolume] = useState<string>(VOLUMES[1].value);
  const [jours, setJours] = useState<string[]>([]);
  const [plages, setPlages] = useState<Record<string, string[]>>({});
  const [domicile, setDomicile] = useState(false);
  const [zone, setZone] = useState('');
  // 5 · CV
  const [cv, setCv] = useState<Cv | null>(null);
  const [message, setMessage] = useState('');

  const go = (next: number) => {
    setError(null);
    setStep(next);
  };
  const back = () => (step === 0 ? (router.canGoBack() ? router.back() : router.replace('/inscription')) : go(step - 1));

  const validate = (): string | null => {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) return 'Renseignez votre prénom et votre nom.';
      if (!EMAIL.test(email.trim())) return 'Renseignez une adresse e-mail valide.';
      if (!isValidPhone(country, phone)) return 'Le numéro de téléphone est invalide.';
      const postalError = postalCityError(country, postalCode, city);
      if (postalError) return postalError;
    }
    if (step === 2) {
      if (!educationLevel) return 'Choisissez votre niveau de diplôme.';
      if (!diploma.trim()) return 'Précisez votre diplôme et votre spécialité.';
      if (!school.trim()) return 'Précisez votre établissement.';
    }
    if (step === 3) {
      if (niveaux.length === 0) return 'Choisissez au moins un niveau accompagné.';
      if (matieres.length === 0) return 'Choisissez au moins une matière.';
    }
    if (step === 4) {
      if (jours.length === 0) return 'Choisissez au moins un jour.';
      if (jours.some((j) => !(plages[j]?.length))) return 'Choisissez au moins une plage horaire pour chaque jour.';
      if (domicile && !zone.trim()) return 'Précisez votre zone pour les cours à domicile.';
    }
    if (step === 5 && !cv) return 'Ajoutez votre CV.';
    return null;
  };

  const next = () => {
    const invalid = validate();
    if (invalid) return setError(invalid);
    if (step < TOTAL) go(step + 1);
    else void submit();
  };

  const addAutre = () => {
    const v = autre.trim();
    if (!v) return;
    if (!matieres.includes(v)) setMatieres((old) => [...old, v]);
    setAutre('');
  };

  const pickCv = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: CV_TYPES });
    if (result.canceled) return;
    const file = result.assets[0];
    if (file.size && file.size > CV_MAX) return setError('Le CV ne doit pas dépasser 10 Mo.');
    setCv(file);
  };

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const disponibilites = jours.map((j) => `${j} · ${(plages[j] ?? []).join(', ')}`);
      const lieux = domicile ? `En ligne et à domicile (${zone.trim()})` : 'En ligne';
      const intro = [
        `Volume visé : ${volume}`,
        `Niveaux accompagnés : ${niveaux.join(', ')}`,
        situation ? `Situation actuelle : ${situation}` : null,
        'Candidature envoyée depuis l’application mobile.',
      ]
        .filter(Boolean)
        .join('\n');

      const body = new FormData();
      body.append('name', lastName.trim());
      body.append('surname', firstName.trim());
      body.append('email', email.trim().toLowerCase());
      body.append('phone', phoneToStore(country, phone));
      body.append('countryCode', country);
      body.append('city', city.trim());
      body.append('postalCode', postalCode.trim());
      body.append('educationLevel', educationLevel);
      body.append('diploma', diploma.trim());
      body.append('school', school.trim());
      if (situation) body.append('professionalSituation', situation);
      body.append('niveauEtude', niveaux.join(', '));
      body.append('lieux', lieux);
      body.append('disponibilites', JSON.stringify(disponibilites));
      body.append('matieres', JSON.stringify(matieres));
      body.append('logiciels', JSON.stringify([]));
      body.append('message', message.trim() ? `${intro}\n\n${message.trim()}` : intro);
      if (cv!.file) body.append('cv', cv!.file);
      else body.append('cv', { uri: cv!.uri, name: cv!.name, type: cv!.mimeType ?? 'application/octet-stream' } as unknown as Blob);

      await api.postuler(body);
      go(6);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La candidature n’a pas pu être envoyée.');
    } finally {
      setSending(false);
    }
  };

  // ─── Introduction ──────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <SignupShell eyebrow="REJOIGNEZ L’ÉQUIPE PÉDAGOGIQUE" title="Transmettez votre savoir" subtitle="Présentez votre parcours et les matières que vous souhaitez enseigner." onBack={back} backLabel="Retour">
        <View style={{ gap: 12 }}>
          {[
            ['person-outline', 'Vos coordonnées', 'Pour vous recontacter'],
            ['school-outline', 'Votre formation', 'Diplôme, spécialité, établissement'],
            ['book-outline', 'Votre enseignement', 'Niveaux et matières'],
            ['calendar-outline', 'Dates et horaires', 'Volume visé et créneaux habituels'],
            ['document-text-outline', 'Votre CV', 'PDF, Word ou image'],
          ].map(([icon, title, text], i) => (
            <View key={title} style={[styles.stepRow, { borderColor: c.border }]}>
              <View style={[styles.stepIcon, { backgroundColor: c.surfaceAlt }]}>
                <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.cardTitle, { color: c.text, fontSize: 14 }]}>
                  {i + 1}. {title}
                </Text>
                <Text style={[t.captionRegular, { color: c.muted }]}>{text}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={[t.captionRegular, { color: c.muted, textAlign: 'center' }]}>Environ 5 minutes · Bac+3 minimum</Text>
        <PrimaryButton title="Commencer ma candidature" onPress={() => go(1)} />
      </SignupShell>
    );
  }

  // ─── Envoyée ───────────────────────────────────────────────────────────
  if (step === 6) {
    return (
      <SignupShell eyebrow="MERCI POUR VOTRE INTÉRÊT" title="Candidature envoyée" subtitle={`Merci ${firstName.trim()}. Votre candidature est prête à être étudiée par notre équipe pédagogique.`} onBack={() => router.replace('/login')}>
        <Card tone="info">
          <Text style={[t.cardTitle, { color: c.text }]}>Et maintenant ?</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            Notre équipe examine votre parcours, vos matières et vos disponibilités. Un conseiller pédagogique pourra vous contacter pour poursuivre l’échange.
          </Text>
        </Card>
        <Card>
          <Text style={[t.cardTitle, { color: c.text }]}>Restez joignable</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            Pensez à consulter votre messagerie à l’adresse {email.trim().toLowerCase()}.
          </Text>
        </Card>
        <PrimaryButton title="Retour à la connexion" onPress={() => router.replace('/login')} />
      </SignupShell>
    );
  }

  const titles: Record<number, [string, string?]> = {
    1: ['Vos coordonnées'],
    2: ['Votre formation', 'Précisez votre diplôme et votre spécialité.'],
    3: ['Votre enseignement', 'Plusieurs choix possibles.'],
    4: ['Dates et horaires', 'Plusieurs choix possibles.'],
    5: ['Votre CV', 'Ajoutez votre CV pour présenter votre parcours.'],
  };

  return (
    <SignupShell step={step} total={TOTAL} title={titles[step][0]} subtitle={titles[step][1]} onBack={back}>
      {step === 1 ? (
        <View style={s.gap}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Prénom *" placeholder="Camille" value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Nom *" placeholder="Martin" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
            </View>
          </View>
          <Field
            label="Adresse e-mail *"
            placeholder="camille.martin@exemple.fr"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
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
      ) : null}

      {step === 2 ? (
        <View style={s.gap}>
          <SelectField
            label="Niveau de diplôme *"
            value={educationLevel}
            options={EDUCATION_LEVELS.map((v) => ({ value: v, label: v.replace('BAC', 'Bac') }))}
            onChange={setEducationLevel}
            placeholder="Choisir"
          />
          <Field label="Diplôme et spécialité *" placeholder="Master de mathématiques" value={diploma} onChangeText={setDiploma} />
          <Field label="Établissement *" placeholder="Université Claude Bernard Lyon 1" value={school} onChangeText={setSchool} />
          <SelectField
            label="Situation actuelle"
            value={situation}
            options={PROFESSIONAL_SITUATIONS.map((v) => ({ value: v, label: v }))}
            onChange={setSituation}
            placeholder="Choisir"
          />
          <Card tone="info">
            <Text style={[t.caption, { color: c.link, fontSize: 13 }]}>Bac+3 minimum</Text>
            <Text style={[t.cardText, { color: c.muted }]}>
              Vous avez le goût de la pédagogie et de bonnes qualités relationnelles ? Faisons connaissance.
            </Text>
          </Card>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: 18 }}>
          <View style={{ gap: 8 }}>
            <GroupLabel>Niveaux accompagnés *</GroupLabel>
            <View style={s.wrap}>
              {NIVEAUX_ENSEIGNES.map((n) => (
                <CheckChip key={n} label={n} selected={niveaux.includes(n)} onPress={() => setNiveaux((old) => toggle(old, n))} />
              ))}
            </View>
          </View>
          <View style={{ gap: 10 }}>
            <GroupLabel>
              Matières enseignées{matieres.length ? ` (${matieres.length} ajoutée${matieres.length > 1 ? 's' : ''})` : ''} *
            </GroupLabel>
            {MATIERES_PAR_DOMAINE.map((g) => (
              <View key={g.domaine} style={{ gap: 6 }}>
                <Text style={[t.captionRegular, { color: c.muted }]}>{g.domaine}</Text>
                <View style={s.wrap}>
                  {g.matieres.map((m) => (
                    <CheckChip key={m} label={m} selected={matieres.includes(m)} onPress={() => setMatieres((old) => toggle(old, m))} />
                  ))}
                </View>
              </View>
            ))}
            {matieres.filter((m) => !MATIERES_PAR_DOMAINE.some((g) => g.matieres.includes(m))).length ? (
              <View style={s.wrap}>
                {matieres
                  .filter((m) => !MATIERES_PAR_DOMAINE.some((g) => g.matieres.includes(m)))
                  .map((m) => (
                    <CheckChip key={m} label={m} selected onPress={() => setMatieres((old) => toggle(old, m))} />
                  ))}
              </View>
            ) : null}
            <Field
              label="Ajouter une autre matière"
              placeholder="Ex. SVT"
              value={autre}
              onChangeText={setAutre}
              onSubmitEditing={addAutre}
              returnKeyType="done"
              right={
                <Pressable accessibilityRole="button" accessibilityLabel="Ajouter la matière" onPress={addAutre} hitSlop={10}>
                  <Ionicons name="add-circle-outline" size={22} color={c.link} />
                </Pressable>
              }
            />
          </View>
        </View>
      ) : null}

      {step === 4 ? (
        <View style={{ gap: 18 }}>
          <View style={{ gap: 8 }}>
            <GroupLabel>Volume d’enseignement visé *</GroupLabel>
            {VOLUMES.map((v) => (
              <RadioRow key={v.value} label={v.value} hint={'badge' in v ? undefined : v.hint} badge={'badge' in v ? v.badge : undefined} selected={volume === v.value} onPress={() => setVolume(v.value)} />
            ))}
          </View>

          <View style={{ gap: 8 }}>
            <GroupLabel>Jours & plages habituels *</GroupLabel>
            <View style={s.wrap}>
              {JOURS.map((j) => {
                const on = jours.includes(j);
                return (
                  <Pressable
                    key={j}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={j}
                    onPress={() => setJours((old) => toggle(old, j))}
                    style={[styles.day, { backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : c.border }]}
                  >
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: on ? c.onPrimary : c.text }}>{j.slice(0, 3)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {JOURS.filter((j) => jours.includes(j)).map((j, i) => (
              <View key={j} style={[styles.dayCard, { borderColor: c.border, backgroundColor: c.bg }]}>
                <View style={styles.dayHead}>
                  <View style={[styles.dayNum, { backgroundColor: c.surfaceAlt }]}>
                    <Text style={[t.caption, { color: c.link }]}>{i + 1}</Text>
                  </View>
                  <Text style={[t.cardTitle, { color: c.text, flex: 1, fontSize: 14 }]}>{j}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${j}`} onPress={() => setJours((old) => old.filter((x) => x !== j))} hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color={c.muted} />
                  </Pressable>
                </View>
                <View style={s.wrap}>
                  {PLAGES.map((p) => (
                    <CheckChip
                      key={p.value}
                      label={`${p.value} · ${p.hint}`}
                      selected={(plages[j] ?? []).includes(p.value)}
                      onPress={() => setPlages((old) => ({ ...old, [j]: toggle(old[j] ?? [], p.value) }))}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>

          <View style={{ gap: 8 }}>
            <GroupLabel>Où enseigner ?</GroupLabel>
            <View style={s.wrap}>
              <CheckChip label="En ligne" selected onPress={() => undefined} />
              <CheckChip label="À domicile" selected={domicile} onPress={() => setDomicile((v) => !v)} />
            </View>
            {domicile ? <Field label="Zone pour les cours à domicile *" placeholder="Lyon et alentours (15 km)" value={zone} onChangeText={setZone} /> : null}
          </View>
        </View>
      ) : null}

      {step === 5 ? (
        <View style={s.gap}>
          {cv ? (
            <View style={[styles.file, { borderColor: c.accent, backgroundColor: c.accentSoft }]}>
              <Ionicons name="document-text-outline" size={26} color={c.onAccent} />
              <View style={{ flex: 1 }}>
                <Text style={[t.cardTitle, { color: c.text, fontSize: 14 }]} numberOfLines={1}>
                  {cv.name}
                </Text>
                <Text style={[t.captionRegular, { color: c.onAccent }]}>Fichier sélectionné{cv.size ? ` · ${kb(cv.size)}` : ''}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={c.onAccent} />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={pickCv}
              style={({ pressed }) => [styles.drop, { borderColor: c.primary, backgroundColor: pressed ? c.primarySoft : c.surfaceAlt }]}
            >
              <Ionicons name="cloud-upload-outline" size={30} color={c.primary} />
              <Text style={[t.cardTitle, { color: c.link }]}>Choisir mon CV</Text>
              <Text style={[t.captionRegular, { color: c.muted }]}>PDF, Word, JPG ou PNG · 10 Mo maximum</Text>
            </Pressable>
          )}
          {cv ? <SecondaryButton title="Choisir un autre fichier" onPress={pickCv} /> : null}
          <Field
            label="Quelques mots sur vous (facultatif)"
            placeholder="Votre expérience, votre façon d’enseigner…"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1500}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
          <Card tone="info">
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={c.primary} />
              <Text style={[t.cardText, { color: c.muted, flex: 1 }]}>
                Votre dossier sera transmis à notre équipe pédagogique. Vos informations ne sont utilisées que pour étudier votre candidature.
              </Text>
            </View>
          </Card>
        </View>
      ) : null}

      {error ? <Notice kind="error">{error}</Notice> : null}
      <PrimaryButton title={step === TOTAL ? 'Soumettre ma candidature' : 'Continuer'} onPress={next} loading={sending} />
    </SignupShell>
  );
}

const styles = StyleSheet.create({
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.md, padding: 14 },
  stepIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  day: { width: 44, height: 40, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayCard: { borderWidth: 1, borderRadius: radius.md, padding: 12, gap: 10 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  file: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  drop: { alignItems: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.lg, paddingVertical: 28 },
});
