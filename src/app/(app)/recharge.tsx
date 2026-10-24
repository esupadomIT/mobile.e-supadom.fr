import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, Choice, Section, StepBar } from '@/components/forms';
import { Notice, PrimaryButton, SecondaryButton, YellowButton } from '@/components/ui';
import { API_URL } from '@/config';
import { api } from '@/lib/api';
import { fullName } from '@/lib/format';
import { FULL_USER_KEY, ME_KEY } from '@/lib/home';
import { euros, getDefaultIncludedHolidayIds, getHolidayShortLabel, getSchoolHolidayId, type MatiereChoisie, type ModePaiement } from '@/lib/pricing';
import {
  INITIAL_STATE,
  profileMatieres,
  STAGE_OPTIONS,
  TYPE_LABELS,
  useRechargeComputation,
  useRechargeData,
  type RechargeComputation,
  type RechargeData,
  type RechargeState,
  type TypeCoursPrincipal,
} from '@/lib/recharge';
import { radius, shadow, useColors } from '@/theme';
import type { Partner } from '@/types';

type Patch = (p: Partial<RechargeState>) => void;
type Done = { provider: 'paypal' | 'alma'; orderID: string; amount: number };

/** URL de retour vers l'app après PayPal / Alma (relayée par l'API, ces prestataires n'acceptant que des URL web). */
const appReturn = (provider: string, status: string) => Linking.createURL('paiement-retour', { queryParams: { provider, status } });
const relay = (to: string) => `${API_URL}/api/v1/mobile/return?to=${encodeURIComponent(to)}`;

/** Recharger mon compte : même parcours en 4-5 étapes que /dashboards/nos-formules du site. */
export default function RechargeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { data, classe, isLoading, error, refetchUser } = useRechargeData();
  const [st, setSt] = useState<RechargeState>(INITIAL_STATE);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Done | null>(null);
  const comp = useRechargeComputation(st, data);
  const patch: Patch = (p) => setSt((s) => ({ ...s, ...p }));

  const steps = useMemo(() => {
    const step2 = comp && (comp.isStage || comp.hasAbonnement) ? 'Choix des matières' : "Nombre d'heures";
    return comp?.hasAbonnement
      ? ['Type de besoin', 'Type de cours', step2, 'Mode de paiement', 'Paiement']
      : ['Type de besoin', 'Type de cours', step2, 'Paiement'];
  }, [comp]);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => {
    if (step === 0) return router.back();
    // Comme le site (rechargement à l'étape 1) : revenir au début repart d'un parcours vierge
    if (step === 1) setSt((s) => ({ ...INITIAL_STATE, typeCoursPrincipal: s.typeCoursPrincipal, tailleGroupe: s.tailleGroupe, vacancesIncluses: s.vacancesIncluses }));
    setStep((s) => s - 1);
  };

  let content: React.ReactNode;
  if (isLoading) content = <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />;
  else if (error) content = <Notice kind="error">{error.message}</Notice>;
  else if (!classe)
    content = (
      <Section title="Classe requise" subtitle="Renseignez votre classe dans votre profil pour voir les formules et leurs tarifs.">
        <PrimaryButton title="Compléter mon profil" onPress={() => router.push('/profil-modifier')} />
      </Section>
    );
  else if (!data || !comp) content = <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />;
  else if (done) content = <DoneView done={done} email={data.user.email} />;
  else {
    const props = { st, patch, comp, data, next, back };
    const isModeStep = comp.hasAbonnement && step === 3;
    content =
      step === 0 ? (
        <StepTypeBesoin {...props} />
      ) : step === 1 ? (
        <StepTypeCours {...props} />
      ) : step === 2 ? (
        comp.isStage || comp.hasAbonnement ? (
          <StepMatieres {...props} refetchUser={() => void refetchUser()} />
        ) : (
          <StepHeures {...props} />
        )
      ) : isModeStep ? (
        <StepModePaiement {...props} />
      ) : (
        <StepPaiement {...props} onDone={setDone} />
      );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={[styles.header, { backgroundColor: c.primary, paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={done ? () => router.back() : back} hitSlop={12}>
              <Ionicons name={done || step === 0 ? 'close' : 'chevron-back'} size={26} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Recharger mon compte</Text>
          </View>
          {!done && classe ? <StepBar steps={steps} current={step} /> : null}
        </View>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      </View>
    </>
  );
}

type StepProps = { st: RechargeState; patch: Patch; comp: RechargeComputation; data: RechargeData; next: () => void; back: () => void };

function NavButtons({ onNext, nextLabel = 'Suivant', disabled, back }: { onNext: () => void; nextLabel?: string; disabled?: boolean; back: () => void }) {
  return (
    <View style={styles.nav}>
      <View style={{ flex: 1 }}>
        <SecondaryButton title="Précédent" onPress={back} />
      </View>
      <View style={{ flex: 1.4 }}>
        <PrimaryButton title={nextLabel} onPress={onNext} disabled={disabled} />
      </View>
    </View>
  );
}

function Selection({ st }: { st: RechargeState }) {
  const c = useColors();
  const label = st.typeCoursPrincipal === 'cours_groupe' ? `Cours collectifs en petits groupes (${st.tailleGroupe === 'duo' ? 'duo' : '3 et +'})` : TYPE_LABELS[st.typeCoursPrincipal];
  return label ? <Text style={{ color: c.muted, fontSize: 13 }}>Vous avez sélectionné : {label}</Text> : null;
}

// ─── Étape 1 : type de besoin ─────────────────────────────────────────────

function StepTypeBesoin({ st, patch, comp, next }: StepProps) {
  const c = useColors();
  const options: TypeCoursPrincipal[] = comp.isSuperieur ? ['cours_particuliers', 'cours_groupe'] : ['cours_hors_vacances', 'cours_avec_vacances', 'stages_vacances'];

  useEffect(() => {
    if (!st.typeCoursPrincipal) patch({ typeCoursPrincipal: options[0] });
  }, [st.typeCoursPrincipal]); // eslint-disable-line react-hooks/exhaustive-deps

  const included = st.vacancesIncluses ?? getDefaultIncludedHolidayIds(comp.vacancesDisponibles);
  const toggleVacance = (id: string) => patch({ vacancesIncluses: included.includes(id) ? included.filter((v) => v !== id) : [...included, id] });
  const canProceed = st.typeCoursPrincipal === 'cours_groupe' ? !!st.tailleGroupe : !!st.typeCoursPrincipal;

  return (
    <>
      <Section title="Quel est votre besoin ?">
        {options.map((o) => (
          <View key={o} style={{ gap: 10 }}>
            <Choice
              label={TYPE_LABELS[o]}
              selected={st.typeCoursPrincipal === o}
              onPress={() => patch({ typeCoursPrincipal: o, typeForfait: '', matieres: [], modePaiement: 'comptant', ...(o !== 'cours_groupe' ? { tailleGroupe: '' } : {}) })}
            />
            {o === 'cours_avec_vacances' && st.typeCoursPrincipal === o ? (
              <View style={[styles.inset, { backgroundColor: c.surfaceAlt }]}>
                <Text style={{ color: c.text, fontWeight: '700' }}>Vacances scolaires concernées :</Text>
                {comp.vacancesAffichees.length === 0 ? (
                  <Text style={{ color: c.muted }}>
                    {holidaysHint(comp)}
                  </Text>
                ) : (
                  <View style={styles.wrap}>
                    {comp.vacancesAffichees.map((h) => {
                      const id = getSchoolHolidayId(h);
                      return <Chip key={id} label={getHolidayShortLabel(h) ?? ''} selected={included.includes(id)} onPress={() => toggleVacance(id)} />;
                    })}
                  </View>
                )}
              </View>
            ) : null}
          </View>
        ))}
      </Section>
      {st.typeCoursPrincipal === 'cours_groupe' ? (
        <Section title="Taille du groupe">
          <Choice label="Duo" selected={st.tailleGroupe === 'duo'} onPress={() => patch({ tailleGroupe: 'duo' })} />
          <Choice label="Groupe (3 et +)" selected={st.tailleGroupe === '3_et_plus'} onPress={() => patch({ tailleGroupe: '3_et_plus' })} />
        </Section>
      ) : null}
      <PrimaryButton title="Suivant" onPress={next} disabled={!canProceed} />
    </>
  );
}

function holidaysHint(comp: RechargeComputation) {
  return comp.vacancesDisponibles.length === 0
    ? 'Aucune vacance scolaire trouvée pour votre zone. Vérifiez que votre code postal est renseigné dans votre profil.'
    : 'Aucune période de vacances à choisir.';
}

// ─── Étape 2 : type de cours ──────────────────────────────────────────────

function StepTypeCours({ st, patch, comp, data, next, back }: StepProps) {
  const options = useMemo(() => {
    if (!data.typesCours.length) return [];
    if (comp.isStage || comp.hasAbonnement) return STAGE_OPTIONS;
    const niveau = data.user.userClasses?.[0]?.classe?.niveau?.nom ?? '';
    return data.typesCours
      .filter((o) => {
        if (o.hideFor?.includes(niveau)) return false;
        const val = o.value?.toLowerCase();
        if (val === '1er_cours_offert') return false;
        if (val === 'soutien_scolaire') return !comp.isSuperieur;
        return comp.isSuperieur;
      })
      .map((o) => ({ value: o.value, label: o.label }));
  }, [data.typesCours, data.user, comp.isStage, comp.hasAbonnement, comp.isSuperieur]);

  useEffect(() => {
    if (options.length && !st.typeForfait) patch({ typeForfait: options[0].value });
  }, [options, st.typeForfait]); // eslint-disable-line react-hooks/exhaustive-deps

  const [error, setError] = useState<string | null>(null);
  const onNext = () => {
    if (!st.typeForfait) return setError('Veuillez sélectionner une option avant de continuer.');
    if (comp.selectedOption && typeof comp.selectedOption.price === 'object' && !comp.classeNom)
      return setError('Veuillez définir votre niveau scolaire dans votre profil pour continuer.');
    next();
  };

  return (
    <>
      <Section title="Type de cours">
        {options.length === 0 ? <Text>Aucune option disponible pour ce type de cours.</Text> : null}
        {options.map((o) => (
          <Choice key={o.value} label={o.label} selected={st.typeForfait === o.value} onPress={() => patch({ typeForfait: o.value })} />
        ))}
        <Selection st={st} />
      </Section>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <NavButtons onNext={onNext} back={back} disabled={!options.length} />
    </>
  );
}

// ─── Étape 3a : matières (abonnement / stages) ────────────────────────────

const DUREES = [
  { value: '1', label: '1H' },
  { value: '1.5', label: '1,5H' },
  { value: '2', label: '2H' },
];
const FREQUENCES = [
  { value: '1', label: '1 cours/sem.' },
  { value: '2', label: '2 cours/sem.' },
  { value: 'autre', label: 'Autre' },
];

function StepMatieres({ st, patch, comp, data, next, back, refetchUser }: StepProps & { refetchUser: () => void }) {
  const c = useColors();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = profileMatieres(data.user);
  const isSelected = (id: string) => st.matieres.some((m) => m.id === id);

  const toggle = (m: { id: string; nom: string }) => {
    setError(null);
    patch({
      matieres: isSelected(m.id) ? st.matieres.filter((x) => x.id !== m.id) : [...st.matieres, { ...m, duree: '1', frequence: '1', autreFrequence: '' }],
    });
  };
  const update = (id: string, p: Partial<MatiereChoisie>) => patch({ matieres: st.matieres.map((m) => (m.id === id ? { ...m, ...p } : m)) });

  const onNext = () => {
    if (!st.matieres.length) return setError('Veuillez sélectionner au moins une matière.');
    if (comp.hasAbonnement && st.matieres.some((m) => m.frequence === 'autre' && !(parseInt(m.autreFrequence, 10) > 0)))
      return setError('Indiquez le nombre de cours par semaine pour « Autre ».');
    next();
  };

  return (
    <>
      <Section
        title="Choix des matières"
        subtitle={comp.hasAbonnement ? 'Pour chaque matière, choisissez la durée et le nombre de cours par semaine.' : 'Matières du stage'}
        right={
          <Pressable onPress={() => setAdding(true)} hitSlop={8} style={[styles.pill, { backgroundColor: c.primarySoft }]}>
            <Ionicons name="add" size={18} color={c.primary} />
            <Text style={{ color: c.primary, fontWeight: '700' }}>Matière</Text>
          </Pressable>
        }
      >
        {mine.length === 0 ? <Text style={{ color: c.muted }}>Aucune matière dans votre profil : ajoutez-en une.</Text> : null}
        {mine.map((m) => {
          const sel = st.matieres.find((x) => x.id === m.id);
          return (
            <View key={m.id} style={{ gap: 10 }}>
              <Choice label={m.nom} multiple selected={!!sel} onPress={() => toggle(m)} />
              {sel && comp.hasAbonnement ? (
                <View style={[styles.inset, { backgroundColor: c.surfaceAlt }]}>
                  <Text style={[styles.small, { color: c.muted }]}>Durée du cours</Text>
                  <View style={styles.wrap}>
                    {DUREES.map((d) => (
                      <Chip key={d.value} label={d.label} selected={sel.duree === d.value} onPress={() => update(m.id, { duree: d.value })} />
                    ))}
                  </View>
                  <Text style={[styles.small, { color: c.muted }]}>Fréquence</Text>
                  <View style={styles.wrap}>
                    {FREQUENCES.map((f) => (
                      <Chip key={f.value} label={f.label} selected={sel.frequence === f.value} onPress={() => update(m.id, { frequence: f.value, autreFrequence: f.value === 'autre' ? sel.autreFrequence : '' })} />
                    ))}
                  </View>
                  {sel.frequence === 'autre' ? (
                    <View style={styles.row}>
                      <TextInput
                        value={sel.autreFrequence}
                        onChangeText={(v) => /^\d{0,2}$/.test(v) && update(m.id, { autreFrequence: v })}
                        keyboardType="number-pad"
                        placeholder="3"
                        placeholderTextColor={c.subtle}
                        style={[styles.smallInput, { borderColor: c.border, color: c.text, backgroundColor: c.surface }]}
                      />
                      <Text style={{ color: c.text }}>cours par semaine</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
        <Selection st={st} />
      </Section>

      {st.matieres.length ? (
        <View style={[styles.priceCard, shadow, { backgroundColor: c.accentSoft }]}>
          <View style={{ flex: 1 }}>
            {comp.hasAbonnement ? (
              <Text style={{ color: c.onAccent }}>
                {Math.round(comp.heures)} h sur {comp.weeks} semaines
              </Text>
            ) : (
              <Text style={{ color: c.onAccent }}>{st.matieres.length} matière(s)</Text>
            )}
            {comp.fraisDossier ? <Text style={{ color: c.onAccent, fontSize: 12 }}>+ frais de dossier {euros(comp.fraisDossier)}</Text> : null}
          </View>
          <Text style={{ color: c.onAccent, fontSize: 20, fontWeight: '800' }}>{euros(comp.calculatePrice)}</Text>
        </View>
      ) : null}

      {error ? <Notice kind="error">{error}</Notice> : null}
      <NavButtons onNext={onNext} back={back} />
      <AddMatieresSheet
        visible={adding}
        onClose={() => setAdding(false)}
        data={data}
        onAdded={() => {
          setAdding(false);
          refetchUser();
        }}
      />
    </>
  );
}

function AddMatieresSheet({ visible, onClose, data, onAdded }: { visible: boolean; onClose: () => void; data: RechargeData; onAdded: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const classeId = data.user.userClasses?.[0]?.classe?.id;
  const [list, setList] = useState<{ id: number; nom: string }[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !classeId) return;
    setList(null);
    setPicked([]);
    setSearch('');
    setError(null);
    const mine = profileMatieres(data.user);
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    api
      .availableMatieres(classeId, mine.map((m) => m.id))
      .then((all) => {
        const seen = new Set(mine.map((m) => norm(m.nom)));
        setList(all.filter((m) => !seen.has(norm(m.nom)) && (seen.add(norm(m.nom)), true)));
      })
      .catch((e: Error) => setError(e.message));
  }, [visible, classeId, data.user]);

  const shown = (list ?? []).filter((m) => m.nom.toLowerCase().includes(search.toLowerCase()));
  const submit = async () => {
    setBusy(true);
    try {
      await api.addMatieres(data.user.id, picked);
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.row}>
          <Text style={{ flex: 1, color: c.text, fontSize: 17, fontWeight: '800' }}>Ajouter des matières</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={c.muted} />
          </Pressable>
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher une matière…"
          placeholderTextColor={c.subtle}
          style={[styles.search, { borderColor: c.border, color: c.text }]}
        />
        <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 8 }}>
          {list === null && !error ? <ActivityIndicator color={c.primary} /> : null}
          {list && list.length === 0 ? <Text style={{ color: c.muted }}>Vous avez déjà toutes les matières disponibles pour votre niveau.</Text> : null}
          {shown.map((m) => (
            <Choice
              key={m.id}
              label={m.nom}
              multiple
              selected={picked.includes(m.nom)}
              onPress={() => setPicked((p) => (p.includes(m.nom) ? p.filter((x) => x !== m.nom) : [...p, m.nom]))}
            />
          ))}
        </ScrollView>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <PrimaryButton title={`Valider${picked.length ? ` (${picked.length})` : ''}`} onPress={submit} loading={busy} disabled={!picked.length} />
      </View>
    </Modal>
  );
}

// ─── Étape 3b : nombre d'heures (supérieur) ───────────────────────────────

function StepHeures({ st, patch, comp, next, back }: StepProps) {
  const c = useColors();
  const setHours = (h: number) => patch({ hours: Math.max(2, Math.min(100, h)) });
  return (
    <>
      <Section title="Nombre d'heures" subtitle="Le tarif horaire est dégressif en fonction du nombre d'heures achetées.">
        <View style={styles.stepper}>
          <Pressable onPress={() => setHours(st.hours - 1)} style={[styles.stepBtn, { backgroundColor: c.primarySoft }]}>
            <Ionicons name="remove" size={24} color={c.primary} />
          </Pressable>
          <Text style={{ color: c.text, fontSize: 36, fontWeight: '800', minWidth: 90, textAlign: 'center' }}>{st.hours} h</Text>
          <Pressable onPress={() => setHours(st.hours + 1)} style={[styles.stepBtn, { backgroundColor: c.primarySoft }]}>
            <Ionicons name="add" size={24} color={c.primary} />
          </Pressable>
        </View>
        <View style={[styles.wrap, { justifyContent: 'center' }]}>
          {[5, 10, 20, 30, 50, 100].map((h) => (
            <Chip key={h} label={`${h} h`} selected={st.hours === h} onPress={() => setHours(h)} />
          ))}
        </View>
        <Selection st={st} />
      </Section>
      <View style={[styles.priceCard, shadow, { backgroundColor: c.accentSoft }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: c.onAccent, fontWeight: '700' }}>
            {comp.currentForfait ? `${comp.currentForfait.nom} [${comp.currentForfait.heureMin}H-${comp.currentForfait.heureMax}H]` : `Pack de ${st.hours} heures`}
          </Text>
          {comp.currentForfait?.echeance ? <Text style={{ color: c.onAccent, fontSize: 12 }}>Validité : {comp.currentForfait.echeance}</Text> : null}
          {comp.fraisDossier ? <Text style={{ color: c.onAccent, fontSize: 12 }}>Frais de dossier : {euros(comp.fraisDossier)}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: c.onAccent, fontSize: 20, fontWeight: '800' }}>{euros(comp.calculatePrice)}</Text>
          <Text style={{ color: c.onAccent, fontSize: 12 }}>{euros(comp.prixHoraire)}/h</Text>
        </View>
      </View>
      <NavButtons onNext={next} back={back} />
    </>
  );
}

// ─── Étape 4 (abonnement) : mode de paiement ──────────────────────────────

const ALMA_COLORS: Record<string, string> = { alma4x: '#2563EB', alma10x: '#7C3AED', alma12x: '#DB2777' };

function StepModePaiement({ st, patch, comp, next, back }: StepProps) {
  const c = useColors();
  const visibles = (['alma4x', 'alma10x', 'alma12x'] as const).filter((m) => comp.alma[m].eligible);
  const majMax = Math.max(0, ...visibles.map((m) => comp.alma[m].majoration));
  const heuresPack = comp.prixHoraire > 0 ? comp.calculatePrice / comp.prixHoraire : 0;
  const economie = (maj: number) => Math.max(0, majMax - maj) * heuresPack;
  const nom = comp.formuleAffichee?.nom || 'votre formule';

  const Card = ({ mode, title, badge, amount, sub, color }: { mode: ModePaiement; title: string; badge: string; amount: number; sub: string; color: string }) => {
    const selected = comp.mode === mode;
    const saving = economie(mode === 'comptant' ? 0 : comp.alma[mode].majoration);
    return (
      <Pressable
        onPress={() => patch({ modePaiement: mode })}
        style={[styles.modeCard, { borderColor: selected ? color : c.border, backgroundColor: selected ? `${color}12` : c.surface }]}
      >
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
            <Text style={{ color, fontWeight: '700', fontSize: 12 }}>{badge}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? color : c.subtle} />
        </View>
        <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>{title}</Text>
        <Text style={{ color: c.text, fontSize: 24, fontWeight: '800' }}>{euros(amount)}</Text>
        <Text style={{ color: c.muted, fontSize: 13 }}>{sub}</Text>
        {visibles.length && saving > 0.01 ? (
          <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 13 }}>Économisez {Math.round(saving)} € par rapport au paiement le plus étalé</Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <>
      <Section title="Choisissez le rythme de paiement" subtitle={`Votre ${nom} : le meilleur tarif en une fois, ou des mensualités avec Alma.`}>
        {comp.formuleAffichee?.avantages?.length ? (
          <View style={{ gap: 4 }}>
            {comp.formuleAffichee.avantages.map((a, i) => (
              <Text key={i} style={{ color: c.text }}>
                ✅ {a}
              </Text>
            ))}
          </View>
        ) : null}
        <Card
          mode="comptant"
          title="Paiement comptant"
          badge="💚 Meilleur tarif"
          color="#22C55E"
          amount={comp.calculatePrice}
          sub={`En une fois par carte ou PayPal · ${euros(comp.prixHoraire)}/h${comp.validityMonths > 1 ? ` · soit ${euros(comp.calculatePrice / comp.validityMonths)}/mois sur ${comp.validityMonths} mois` : ''}`}
        />
        {visibles.map((m) => {
          const n = m === 'alma4x' ? 4 : m === 'alma10x' ? 10 : 12;
          return (
            <Card
              key={m}
              mode={m}
              title={`Payer en ${n} fois avec Alma`}
              badge={m === 'alma4x' ? '🔷 Paiement flexible' : m === 'alma12x' ? '💗 Mensualité la plus basse' : '⭐ Le plus choisi'}
              color={ALMA_COLORS[m]}
              amount={comp.alma[m].montant}
              sub={`${n} × ${euros(comp.alma[m].montant / n)} · 1er prélèvement aujourd'hui`}
            />
          );
        })}
        {visibles.length < 3 ? <Text style={{ color: c.subtle, fontSize: 12 }}>Certains paiements en plusieurs fois ne sont pas proposés pour ce montant ou cette période.</Text> : null}
      </Section>
      <NavButtons onNext={next} back={back} />
    </>
  );
}

// ─── Dernière étape : récapitulatif et paiement ───────────────────────────

function StepPaiement({ st, comp, data, back, onDone }: StepProps & { onDone: (d: Done) => void }) {
  const c = useColors();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const user = data.user;
  const nbFois = comp.mode === 'alma4x' ? 4 : comp.mode === 'alma10x' ? 10 : comp.mode === 'alma12x' ? 12 : 1;

  const payPaypal = async () => {
    const order = await api.createPaypalOrder({
      amount: comp.total,
      gender: user.gender,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      description: comp.selectedOption?.value ?? '',
      returnUrl: relay(appReturn('paypal', 'success')),
      cancelUrl: relay(appReturn('paypal', 'cancel')),
    });
    if (!order.approveUrl) throw new Error('Lien de paiement PayPal indisponible. Merci de réessayer.');
    const result = await WebBrowser.openAuthSessionAsync(order.approveUrl, Linking.createURL('paiement-retour'));
    const params = result.type === 'success' ? Linking.parse(result.url).queryParams ?? {} : {};
    if (params.status !== 'success') {
      setNotice({ kind: 'error', text: 'Paiement annulé : vous pouvez réessayer ou choisir un autre mode de règlement.' });
      return;
    }
    await api.capturePaypalFormule({ ...comp.orderBody, orderID: order.id, matieres: st.matieres, selectedInstructors: [] });
    onDone({ provider: 'paypal', orderID: order.id, amount: comp.total });
  };

  const payAlma = async () => {
    const payment = await api.createAlmaPayment({
      ...comp.orderBody,
      phone: user.phone,
      returnUrl: relay(appReturn('alma', 'success')),
      cancelUrl: relay(appReturn('alma', 'cancel')),
    });
    if (!payment.url) throw new Error('URL de paiement Alma manquante.');
    const result = await WebBrowser.openAuthSessionAsync(payment.url, Linking.createURL('paiement-retour'));
    const params = result.type === 'success' ? Linking.parse(result.url).queryParams ?? {} : {};
    if (params.status !== 'success') {
      setNotice({ kind: 'error', text: 'Paiement Alma annulé : vous pouvez choisir un autre mode de règlement.' });
      return;
    }
    onDone({ provider: 'alma', orderID: typeof params.pid === 'string' ? params.pid : payment.id, amount: comp.total });
  };

  const pay = async () => {
    setNotice(null);
    setBusy(true);
    try {
      await (comp.isAlma ? payAlma() : payPaypal());
    } catch (e) {
      setNotice({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Section title="Récapitulatif de la commande">
        {comp.recapRows.map(([label, value]) => (
          <View key={label} style={[styles.recapRow, { borderBottomColor: c.border }]}>
            <Text style={{ color: c.muted, flex: 1 }}>{label}</Text>
            <Text style={{ color: c.text, fontWeight: '600', flex: 1.6, textAlign: 'right' }}>{value}</Text>
          </View>
        ))}
      </Section>
      <View style={[styles.totalCard, { backgroundColor: c.accentSoft }]}>
        <Row label={comp.hasAbonnement ? 'Prix formule' : 'Montant'} value={euros(comp.montantAujourdhui)} />
        {comp.isAlma ? <Row label={`Soit ${nbFois} mensualités de`} value={euros(comp.montantAujourdhui / nbFois)} /> : null}
        {comp.fraisDossier ? <Row label="Frais de dossier" value={euros(comp.fraisDossier)} /> : null}
        <View style={[styles.recapRow, { borderBottomWidth: 0 }]}>
          <Text style={{ color: c.onAccent, fontWeight: '800', fontSize: 16, flex: 1 }}>Total{comp.isAlma ? ' financé' : ''}</Text>
          <Text style={{ color: c.onAccent, fontWeight: '800', fontSize: 22 }}>{euros(comp.total)}</Text>
        </View>
      </View>
      {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}
      {comp.isAlma ? (
        <Pressable onPress={pay} disabled={busy} style={[styles.almaBtn, { opacity: busy ? 0.7 : 1 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Payer en {nbFois}X avec Alma</Text>}
        </Pressable>
      ) : busy ? (
        <View style={[styles.almaBtn, { backgroundColor: c.yellow }]}>
          <ActivityIndicator color={c.onYellow} />
        </View>
      ) : (
        <YellowButton title={`Payer ${euros(comp.total)} avec PayPal / carte`} onPress={pay} />
      )}
      <Text style={{ color: c.subtle, fontSize: 12, textAlign: 'center' }}>
        Le paiement s’ouvre dans une page sécurisée {comp.isAlma ? 'Alma' : 'PayPal'}, puis vous revenez dans l’application.
      </Text>
      <SecondaryButton title="Précédent" onPress={back} disabled={busy} />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={[styles.recapRow, { borderBottomColor: 'rgba(11,59,44,0.12)' }]}>
      <Text style={{ color: c.onAccent, flex: 1 }}>{label}</Text>
      <Text style={{ color: c.onAccent, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

// ─── Après paiement : profs à prévenir ────────────────────────────────────

const MAX_ATTEMPTS = 20;
const RETRY_MS = 3000;

function DoneView({ done, email }: { done: Done; email: string }) {
  const c = useColors();
  const qc = useQueryClient();
  const [instructors, setInstructors] = useState<Partner[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [state, setState] = useState<'choose' | 'sending' | 'finished'>('choose');
  const [result, setResult] = useState<{ amount: number; notified: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ME_KEY });
    void qc.invalidateQueries({ queryKey: FULL_USER_KEY });
    api
      .rechargeInstructors(email)
      .then(setInstructors)
      .catch(() => setInstructors([]));
  }, [email, qc]);

  const finish = async (ids: number[]) => {
    setError(null);
    // PayPal : déjà capturé, rien à confirmer si personne n'est à prévenir.
    if (done.provider === 'paypal' && ids.length === 0) {
      setResult({ amount: done.amount, notified: 0 });
      return setState('finished');
    }
    setState('sending');
    try {
      // Alma : le crédit arrive par le webhook, on attend que le paiement soit enregistré (404 en attendant).
      let res: { amount?: number | string } | null = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          res = await api.notifyInstructors(done.orderID, ids, email);
          break;
        } catch (e) {
          const status = (e as { status?: number }).status;
          if (status !== 404 || attempt === MAX_ATTEMPTS) throw e;
          await new Promise((r) => setTimeout(r, RETRY_MS));
        }
      }
      const amount = parseFloat(String(res?.amount ?? ''));
      setResult({ amount: Number.isNaN(amount) ? done.amount : amount, notified: ids.length });
      void qc.invalidateQueries({ queryKey: ME_KEY });
      setState('finished');
    } catch (e) {
      setError((e as Error).message);
      setState('choose');
    }
  };

  if (state === 'finished' && result) {
    return (
      <Section>
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
          <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          <Text style={{ color: c.text, fontSize: 20, fontWeight: '800' }}>Paiement confirmé !</Text>
          <Text style={{ color: c.text, fontSize: 16 }}>Montant rechargé : {euros(result.amount)}</Text>
          <Text style={{ color: c.muted, textAlign: 'center' }}>
            {result.notified > 0
              ? `${result.notified} professeur${result.notified > 1 ? 's ont' : ' a'} été prévenu${result.notified > 1 ? 's' : ''} par e-mail.`
              : 'Aucun professeur n’a été prévenu.'}
          </Text>
        </View>
        <PrimaryButton title="Terminer" onPress={() => router.back()} />
      </Section>
    );
  }

  return (
    <>
      <Section>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Ionicons name={done.provider === 'alma' ? 'time-outline' : 'checkmark-circle'} size={56} color={done.provider === 'alma' ? c.primary : '#22C55E'} />
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
            {done.provider === 'alma' ? 'Paiement Alma accepté' : 'Paiement effectué'}
          </Text>
          <Text style={{ color: c.muted, textAlign: 'center' }}>
            {done.provider === 'alma' ? 'Alma finalise la confirmation : votre solde sera crédité dans quelques instants.' : `${euros(done.amount)} ajoutés à votre compte.`}
          </Text>
        </View>
      </Section>
      <Section title="Prévenir mes professeurs" subtitle="Les professeurs sélectionnés recevront un e-mail pour planifier vos prochains cours.">
        {instructors === null ? <ActivityIndicator color={c.primary} /> : null}
        {instructors?.length === 0 ? <Text style={{ color: c.muted }}>Aucun professeur récent à prévenir.</Text> : null}
        {(instructors ?? []).map((p) => (
          <Choice
            key={p.id}
            label={fullName(p)}
            multiple
            selected={picked.includes(p.id)}
            onPress={() => setPicked((l) => (l.includes(p.id) ? l.filter((x) => x !== p.id) : [...l, p.id]))}
          />
        ))}
        {error ? <Notice kind="error">{error}</Notice> : null}
        {state === 'sending' ? (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color={c.primary} />
            <Text style={{ color: c.muted }}>Validation du paiement en cours…</Text>
          </View>
        ) : (
          <>
            <PrimaryButton title={picked.length ? `Prévenir ${picked.length} professeur${picked.length > 1 ? 's' : ''}` : 'Continuer'} onPress={() => void finish(picked)} disabled={instructors === null} />
            {picked.length ? <SecondaryButton title="Ne prévenir personne" onPress={() => void finish([])} /> : null}
          </>
        )}
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', flex: 1 },
  body: { padding: 16, gap: 14 },
  nav: { flexDirection: 'row', gap: 10 },
  inset: { borderRadius: radius.md, padding: 12, gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  small: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  smallInput: { width: 64, height: 44, borderWidth: 1.5, borderRadius: radius.sm, textAlign: 'center', fontSize: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  priceCard: { borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  search: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, height: 46, fontSize: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  stepBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  modeCard: { borderWidth: 2, borderRadius: radius.lg, padding: 14, gap: 6 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  recapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  totalCard: { borderRadius: radius.lg, padding: 16 },
  almaBtn: { height: 54, borderRadius: radius.pill, backgroundColor: '#1E1E3F', alignItems: 'center', justifyContent: 'center' },
});
