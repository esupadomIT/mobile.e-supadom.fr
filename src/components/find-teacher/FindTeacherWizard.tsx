import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { BrandHeader } from '@/components/ScreenHeader';
import { Choice, DateField, Section, StepBar } from '@/components/forms';
import { Field, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { DOCUMENT_TYPES, FEELINGS, FIND_TEACHER_STEPS, GENDERS, INITIAL_TEACHER_FORM, OBJECTIVES, selectTeacherSlots, teacherBudget, teacherRequest, validateTeacherFiles, validateTeacherSlots, type TeacherForm, type TeacherSlot } from '@/lib/find-teacher';
import { FULL_USER_KEY, useFullUser } from '@/lib/home';
import { euros } from '@/lib/pricing';
import { addDaysIso, formatIsoDay, hhmm, isoDay } from '@/lib/tz';
import { useColors } from '@/theme';
import type { FullUser } from '@/types';

const allowShortSlots = process.env.EXPO_PUBLIC_ALLOW_SHORT_SLOTS === 'true';
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Cette action n’a pas pu aboutir. Réessayez dans un instant.';
const toggle = (values: string[], value: string) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
const labels = (options: readonly (readonly [string, string])[], values: string[]) => values.map((value) => options.find(([key]) => key === value)?.[1] ?? value).join(', ');
const slotText = (slot: TeacherSlot) => `${formatIsoDay(isoDay(new Date(slot.startDate)))} · ${hhmm(new Date(slot.startDate))} – ${hhmm(new Date(slot.endDate))}`;

export function FindTeacherWizard() {
  const c = useColors();
  const profile = useFullUser();
  if (!profile.data) return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BrandHeader title="Un prof" />
      <View style={{ padding: 20, gap: 16 }}>
        {profile.isError ? <><Notice kind="error">{errorText(profile.error)}</Notice><SecondaryButton title="Réessayer" onPress={() => void profile.refetch()} /></> : <Text style={{ color: c.muted }}>Préparation de votre demande…</Text>}
      </View>
    </View>
  );
  if (!profile.data.userClasses?.[0]?.classe) return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BrandHeader title="Un prof" />
      <View style={{ padding: 20 }}><Section title="Renseignez votre classe" subtitle="Votre classe est nécessaire pour sélectionner les matières et afficher les tarifs."><PrimaryButton title="Compléter mon profil" onPress={() => router.push('/profil-modifier')} /></Section></View>
    </View>
  );
  return <TeacherSteps key={`${profile.data.id}-${profile.data.userClasses[0].classe.id}`} user={profile.data} />;
}

function TeacherSteps({ user }: { user: FullUser }) {
  const c = useColors();
  const qc = useQueryClient();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const submitting = useRef(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TeacherForm>(INITIAL_TEACHER_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verified, setVerified] = useState<{ reference: string; name: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [confirmedSlots, setConfirmedSlots] = useState<TeacherSlot[]>([]);
  const [success, setSuccess] = useState<{ title: string; text: string } | null>(null);
  const classe = user.userClasses![0].classe;
  const subjects = [...new Set((user.matieres ?? []).map(({ matiere }) => matiere.nom))];
  const [addingSubjects, setAddingSubjects] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const available = useQuery({ queryKey: ['find-teacher', 'subjects', classe.id], queryFn: () => api.matieresOfClasse(classe.id), enabled: addingSubjects });
  const slots = useQuery({ queryKey: ['find-teacher', 'slots', user.id], queryFn: async () => selectTeacherSlots(await api.disponibilites(user.id), new Date()), enabled: step >= 3 });
  const prices = useQuery({ queryKey: ['find-teacher', 'prices', classe.id], queryFn: () => api.formule({ id: classe.id }), enabled: step >= 4 });
  const budget = prices.data ? teacherBudget(user, prices.data.typesCours, prices.data.parametres) : null;
  const refetchSlots = slots.refetch;
  useFocusEffect(useCallback(() => {
    if (step === 3) void refetchSlots();
    void qc.invalidateQueries({ queryKey: FULL_USER_KEY });
  }, [step, refetchSlots, qc]));

  const patch = (value: Partial<TeacherForm>) => { setForm((old) => ({ ...old, ...value })); setError(null); };
  const go = (value: number) => { setStep(value); setError(null); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const addSubjects = async () => {
    setBusy(true); setError(null);
    try {
      await api.addMatieres(user.id, selectedSubjects);
      await qc.invalidateQueries({ queryKey: FULL_USER_KEY });
      setSelectedSubjects([]); setAddingSubjects(false);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };

  const pickFiles = async () => {
    setError(null); setUploading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: DOCUMENT_TYPES });
      if (result.canceled) return;
      const invalid = validateTeacherFiles(form.files, result.assets);
      if (invalid) { setError(invalid); return; }
      for (const file of result.assets) {
        const body = new FormData();
        if (file.file) body.append('file', file.file);
        else body.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
        const uploaded = await api.uploadTeacherDocument(body);
        const saved = uploaded.files?.[0];
        if (!uploaded.success || !saved?.filename) throw new Error('Le document n’a pas pu être téléversé.');
        setForm((old) => ({ ...old, files: [...old.files, { name: file.name, uploadedName: saved.filename, size: file.size ?? saved.size, type: file.mimeType ?? saved.type }] }));
      }
    } catch (e) { setError(errorText(e)); }
    finally { setUploading(false); }
  };

  const verifyTeacher = async () => {
    const reference = form.teacherId.trim();
    if (!reference) { setError('Veuillez saisir un identifiant professeur.'); return; }
    setVerifying(true); setError(null); setVerified(null);
    try {
      const result = await api.verifyTeacher(reference);
      if (!result.valid || !result.teacher) throw new Error('Aucun professeur trouvé avec cet identifiant.');
      setVerified({ reference, name: `${result.teacher.firstName} ${result.teacher.lastName}` });
    } catch (e) { setError(errorText(e)); }
    finally { setVerifying(false); }
  };

  const next = async () => {
    setError(null);
    if (step === 0 && !form.matiere) { setError('Veuillez sélectionner une matière.'); return; }
    if (step === 1) {
      if (!form.chapter.trim()) { setError('Veuillez indiquer le chapitre ou thème à travailler.'); return; }
      if (form.deadline && form.deadline < addDaysIso(isoDay(), 1)) { setError('La date d’échéance ne peut pas être antérieure à demain.'); return; }
    }
    if (step === 2) {
      if (!form.genderPreference || !form.hasTeacherId) { setError('Veuillez indiquer vos préférences concernant le professeur.'); return; }
      if (form.hasTeacherId === 'yes' && verified?.reference !== form.teacherId.trim()) { setError('Veuillez vérifier l’identifiant professeur avant de continuer.'); return; }
    }
    if (step === 3) {
      if (!form.confirmedAvailability) { setError('Veuillez confirmer vos disponibilités.'); return; }
      setBusy(true);
      try {
        const refreshed = await slots.refetch();
        if (refreshed.isError) throw refreshed.error;
        const invalid = validateTeacherSlots(refreshed.data ?? [], allowShortSlots);
        if (invalid) { setError(invalid); return; }
        if (JSON.stringify(refreshed.data) !== JSON.stringify(confirmedSlots)) {
          patch({ confirmedAvailability: false }); setError('Vos disponibilités ont changé. Veuillez les confirmer à nouveau.'); return;
        }
      } catch (e) { setError(errorText(e)); return; }
      finally { setBusy(false); }
    }
    if (step === 4 && (!budget || form.budgetConfirmed !== 'yes')) { setError('Veuillez confirmer votre budget ou transmettre votre demande à un conseiller.'); return; }
    go(step + 1);
  };

  const submit = async (adviser = false, abandon = false) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      if (!adviser && !abandon) {
        const refreshed = await slots.refetch();
        if (refreshed.isError) throw refreshed.error;
        const currentSlots = refreshed.data ?? [];
        const invalid = validateTeacherSlots(currentSlots, allowShortSlots);
        if (invalid || JSON.stringify(currentSlots) !== JSON.stringify(confirmedSlots)) {
          go(3); patch({ confirmedAvailability: false }); setError(invalid ?? 'Vos disponibilités ont changé. Veuillez les confirmer à nouveau.'); return;
        }
      }
      const result = await api.requestTeacher(teacherRequest(user, form, confirmedSlots, budget, adviser, abandon));
      if (!result.success) throw new Error(result.message ?? 'La demande n’a pas pu être envoyée.');
      setSuccess({ title: abandon ? 'Demande annulée' : adviser ? 'Demande transmise' : 'Demande envoyée !',
        text: abandon ? 'Votre demande a été annulée. Un récapitulatif a été transmis à notre équipe.' : adviser ? 'Un conseiller vous contactera pour étudier la solution la plus adaptée à votre besoin.' : 'Votre première séance est offerte et sans engagement. Vous recevrez une confirmation par email dès qu’un professeur aura accepté votre demande.' });
      scroll.current?.scrollTo({ y: 0, animated: false });
    } catch (e) { setError(errorText(e)); }
    finally { submitting.current = false; setBusy(false); }
  };
  const abandon = () => Alert.alert('Abandonner la demande ?', 'Votre demande sera annulée. Un récapitulatif sera transmis à notre équipe.', [
    { text: 'Retour', style: 'cancel' }, { text: 'Abandonner', style: 'destructive', onPress: () => void submit(true, true) },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BrandHeader title="Un prof" />
      {!success ? <View style={{ backgroundColor: c.primary, padding: 20 }}><StepBar compact steps={FIND_TEACHER_STEPS} current={step} /></View> : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }} keyboardShouldPersistTaps="handled">
          {success ? <Section title={success.title}>
            <Ionicons name="checkmark-circle" size={48} color={c.primary} />
            <Text style={{ color: c.text, lineHeight: 23 }}>{success.text}</Text>
            <PrimaryButton title="Retour à l’accueil" onPress={() => router.replace('/accueil')} />
            <SecondaryButton title="Nouvelle demande" onPress={() => { setForm(INITIAL_TEACHER_FORM); setVerified(null); setConfirmedSlots([]); setSuccess(null); go(0); }} />
          </Section> : <>
            {step === 0 ? <>
              <Section title="Choisissez votre matière" subtitle="Sélectionnez la matière pour laquelle vous souhaitez réserver votre premier cours offert.">
                {subjects.length ? subjects.map((name) => <Choice key={name} label={name} selected={form.matiere === name} onPress={() => patch({ matiere: form.matiere === name ? '' : name, budgetConfirmed: '' })} />) : <Text style={{ color: c.muted }}>Vous n’avez pas encore de matières dans votre profil.</Text>}
                <SecondaryButton title={addingSubjects ? 'Fermer la liste des matières' : 'Ajouter des matières à mon profil'} onPress={() => setAddingSubjects(!addingSubjects)} />
              </Section>
              {addingSubjects ? <Section title="Ajouter des matières">
                <Field label="Rechercher" value={subjectSearch} onChangeText={setSubjectSearch} />
                {available.isLoading ? <Text style={{ color: c.muted }}>Chargement des matières…</Text> : null}
                {available.isError ? <><Notice kind="error">{errorText(available.error)}</Notice><SecondaryButton title="Réessayer" onPress={() => void available.refetch()} /></> : null}
                {(available.data ?? []).filter((item) => !subjects.includes(item.nom) && item.nom.toLocaleLowerCase().includes(subjectSearch.toLocaleLowerCase())).map((item) => <Choice key={item.id} label={item.nom} multiple selected={selectedSubjects.includes(item.nom)} onPress={() => setSelectedSubjects((old) => toggle(old, item.nom))} />)}
                <PrimaryButton title="Ajouter au profil" onPress={() => void addSubjects()} loading={busy} disabled={!selectedSubjects.length} />
              </Section> : null}
            </> : null}
            {step === 1 ? <>
              <Section title="Décrivez votre besoin" subtitle="Cette première séance offerte permet au professeur de comprendre votre besoin et d’évaluer votre niveau.">
                <Text style={{ color: c.text, fontWeight: '700' }}>Quel est l’objectif du suivi ?</Text>
                {OBJECTIVES.map(([value, label]) => <Choice key={value} label={label} multiple selected={form.objectives.includes(value)} onPress={() => patch({ objectives: toggle(form.objectives, value) })} />)}
                {form.objectives.includes('autre') ? <Field label="Autre objectif" value={form.otherObjective} onChangeText={(otherObjective) => patch({ otherObjective })} /> : null}
                <Field label="Votre besoin ou vos difficultés (optionnel)" multiline maxLength={500} value={form.description} onChangeText={(description) => patch({ description })} style={{ minHeight: 100, textAlignVertical: 'top' }} />
                <Text style={{ color: c.muted, textAlign: 'right', fontSize: 12 }}>{form.description.length}/500</Text>
                <Field label="Chapitre, thème ou sujet à travailler *" placeholder="Fractions, fonctions, dissertation…" value={form.chapter} onChangeText={(chapter) => patch({ chapter })} />
                <DateField label="Échéance importante (optionnel)" value={form.deadline} min={addDaysIso(isoDay(), 1)} onChange={(deadline) => patch({ deadline })} />
                {form.deadline ? <SecondaryButton title="Retirer l’échéance" onPress={() => patch({ deadline: null })} /> : null}
              </Section>
              <Section title="Documents à transmettre" subtitle="PDF, Word, Excel, PowerPoint, JPEG, PNG, TXT, CSV, ZIP. 5 fichiers maximum, 10 Mo par fichier, 20 Mo au total.">
                {form.files.map((file, index) => <View key={file.uploadedName} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text numberOfLines={2} style={{ flex: 1, color: c.text }}>{file.name} · {Math.round(file.size / 1024)} Ko</Text><Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${file.name}`} disabled={uploading} onPress={() => patch({ files: form.files.filter((_, i) => i !== index) })} hitSlop={10}><Ionicons name="close-circle-outline" size={24} color={c.danger} /></Pressable></View>)}
                <SecondaryButton title="Ajouter des documents" loading={uploading} disabled={form.files.length >= 5} onPress={() => void pickFiles()} />
              </Section>
            </> : null}
            {step === 2 ? <>
              <Section title="Choisissez votre professeur" subtitle="Ces informations aideront le professeur à adapter son approche dès la première séance offerte.">
                <Text style={{ color: c.text, fontWeight: '700' }}>Comment votre enfant se sent-il pendant les cours ?</Text>
                {FEELINGS.map(([value, label]) => <Choice key={value} label={label} multiple selected={form.childFeelings.includes(value)} onPress={() => patch({ childFeelings: toggle(form.childFeelings, value) })} />)}
              </Section>
              <Section title="Préférence concernant le professeur" subtitle="Cette préférence sera respectée dans la limite des professeurs disponibles.">
                {GENDERS.map(([value, label]) => <Choice key={value} label={label} selected={form.genderPreference === value} onPress={() => patch({ genderPreference: value })} />)}
              </Section>
              <Section title="Avez-vous un identifiant professeur ?">
                <Choice label="Non, je souhaite être mis(e) en relation avec un professeur disponible" selected={form.hasTeacherId === 'no'} onPress={() => { patch({ hasTeacherId: 'no', teacherId: '' }); setVerified(null); }} />
                <Choice label="Oui, j’ai un identifiant professeur" selected={form.hasTeacherId === 'yes'} onPress={() => patch({ hasTeacherId: 'yes' })} />
                {form.hasTeacherId === 'yes' ? <>
                  <Field label="Identifiant professeur" value={form.teacherId} autoCapitalize="characters" editable={!verifying} onChangeText={(teacherId) => { patch({ teacherId }); setVerified(null); }} />
                  <SecondaryButton title="Vérifier l’identifiant" loading={verifying} onPress={() => void verifyTeacher()} />
                  {verified?.reference === form.teacherId.trim() ? <Notice kind="success">Professeur trouvé : {verified.name}</Notice> : null}
                </> : null}
              </Section>
            </> : null}
            {step === 3 ? <Section title="Confirmez vos disponibilités" subtitle="Votre professeur choisira un créneau parmi les 3 premiers jours disponibles des 7 prochains jours. Horaires de Paris.">
              {slots.isLoading ? <Text style={{ color: c.muted }}>Chargement de vos disponibilités…</Text> : null}
              {slots.isError ? <Notice kind="error">{errorText(slots.error)}</Notice> : null}
              {(slots.data ?? []).map((slot) => <Text key={`${slot.startDate}-${slot.endDate}`} style={{ color: c.text, paddingVertical: 8, lineHeight: 22 }}>{slotText(slot)}</Text>)}
              {!slots.isLoading && !slots.data?.length ? <Text style={{ color: c.muted }}>Ajoutez au moins 3 créneaux d’une heure sur 3 jours différents dans votre agenda.</Text> : null}
              <SecondaryButton title="Ajouter des disponibilités" onPress={() => router.push('/dispos-ajout')} />
              <SecondaryButton title="Actualiser mon agenda" loading={slots.isFetching} onPress={() => { patch({ confirmedAvailability: false }); void slots.refetch(); }} />
              <Choice label="Oui, je confirme être disponible sur ces créneaux" selected={form.confirmedAvailability} disabled={!slots.data?.length || slots.isFetching} onPress={() => { setConfirmedSlots(slots.data ?? []); patch({ confirmedAvailability: !form.confirmedAvailability }); }} />
            </Section> : null}
            {step === 4 ? <Section title="Validez votre budget">
              {prices.isLoading ? <Text style={{ color: c.muted }}>Calcul de votre budget estimé…</Text> : null}
              {prices.isError ? <><Notice kind="error">{errorText(prices.error)}</Notice><SecondaryButton title="Réessayer" onPress={() => void prices.refetch()} /></> : null}
              {budget ? <>
                <Text style={{ color: c.muted, lineHeight: 23 }}>Après votre première séance offerte, vous pourrez choisir de poursuivre avec un accompagnement régulier.</Text>
                <Text style={{ color: c.text, lineHeight: 23 }}>Pour 1 heure de cours par semaine en {form.matiere}, votre budget mensuel indicatif serait entre :</Text>
                <Text style={{ color: c.primary, fontSize: 26, fontWeight: '800' }}>{euros(budget.min)} – {euros(budget.max)} / mois</Text>
                <Text style={{ color: c.muted, lineHeight: 21, fontSize: 13 }}>Le tarif exact dépend de la durée, de la fréquence des séances et de la formule retenue après le cours d’essai.</Text>
                <Choice label="Oui, ce budget me convient" selected={form.budgetConfirmed === 'yes'} onPress={() => patch({ budgetConfirmed: 'yes' })} />
                <Choice label="Non, ce budget ne me convient pas" selected={form.budgetConfirmed === 'no'} onPress={() => patch({ budgetConfirmed: 'no' })} />
              </> : !prices.isLoading && !prices.isError ? <Text style={{ color: c.muted, lineHeight: 22 }}>Aucun tarif n’est disponible pour votre niveau. Votre demande peut être transmise à un conseiller.</Text> : null}
              {form.budgetConfirmed === 'no' || (!budget && prices.isSuccess) ? <>
                <Text style={{ color: c.muted, lineHeight: 22 }}>Notre équipe peut étudier la fréquence des cours, la durée des séances ou une formule en petit groupe adaptée à votre besoin.</Text>
                <PrimaryButton title="Transmettre à un conseiller" loading={busy} onPress={() => void submit(true)} />
                <SecondaryButton title="Abandonner la demande" disabled={busy} onPress={abandon} />
              </> : null}
            </Section> : null}
            {step === 5 ? <>
              <Section title="Récapitulatif de votre demande">
                <Summary label="Étudiant" value={`${user.firstName} ${user.lastName} · ${classe.nom}`} />
                <Summary label="Matière" value={form.matiere} />
                <Summary label="Objectifs" value={labels(OBJECTIVES, form.objectives) + (form.objectives.includes('autre') && form.otherObjective ? ` : ${form.otherObjective}` : '')} />
                <Summary label="Votre besoin" value={form.description} />
                <Summary label="Chapitre ou thème" value={form.chapter} />
                <Summary label="Échéance" value={form.deadline ? formatIsoDay(form.deadline, true) : ''} />
                <Summary label="Documents joints" value={form.files.map((file) => file.name).join('\n') || 'Aucun'} />
                <Summary label="Profil de l’enfant" value={labels(FEELINGS, form.childFeelings)} />
                <Summary label="Préférence professeur" value={labels(GENDERS, [form.genderPreference])} />
                <Summary label="Professeur choisi" value={form.hasTeacherId === 'yes' ? `${verified?.name ?? ''} · ${form.teacherId}` : 'Un professeur disponible'} />
                <Summary label="Disponibilités confirmées" value={confirmedSlots.map(slotText).join('\n')} />
                <Summary label="Budget mensuel indicatif" value={budget ? `${euros(budget.min)} – ${euros(budget.max)}` : 'Non disponible'} />
              </Section>
              <Notice kind="success">Votre première séance est offerte et sans engagement.</Notice>
              <PrimaryButton title="Envoyer ma demande" loading={busy} onPress={() => void submit()} />
              <SecondaryButton title="Abandonner la demande" disabled={busy} onPress={abandon} />
            </> : null}
            {error ? <Notice kind="error">{error}</Notice> : null}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {step > 0 ? <View style={{ flex: 1 }}><SecondaryButton title="Précédent" disabled={busy || uploading || verifying} onPress={() => go(step - 1)} /></View> : null}
              {step < 5 && !(step === 4 && (form.budgetConfirmed === 'no' || !budget)) ? <View style={{ flex: 1 }}><PrimaryButton title="Suivant" onPress={() => void next()} loading={busy} disabled={uploading || verifying || (step === 0 && !form.matiere) || (step === 3 && (slots.isFetching || slots.isError))} /></View> : null}
            </View>
          </>}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  const c = useColors();
  if (!value) return null;
  return <View style={{ gap: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.border }}><Text style={{ color: c.muted, fontSize: 12 }}>{label}</Text><Text style={{ color: c.text, lineHeight: 22 }}>{value}</Text></View>;
}
