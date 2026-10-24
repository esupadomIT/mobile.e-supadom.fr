// État et calculs du parcours « Recharger mon compte » (wizard nos-formules du site).

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { api } from '@/lib/api';
import { useFullUser } from '@/lib/home';
import {
  ALMA_MODES,
  computePackWeeks,
  formuleIdFor,
  frequenceOf,
  getHolidayShortLabel,
  getMajoration,
  getPackValidityMonths,
  getSchoolYearEndDate,
  getWeekStart,
  isModePaiementEligible,
  packHours,
  packPrice,
  parametrePrice,
  resolveForfait,
  stagePrice,
  type Forfait,
  type MatiereChoisie,
  type ModePaiement,
  type Parametre,
  type SchoolHoliday,
  type Stage,
  type TypeCours,
} from '@/lib/pricing';
import { isoDay } from '@/lib/tz';
import type { FullUser } from '@/types';

export type TypeCoursPrincipal = '' | 'cours_hors_vacances' | 'cours_avec_vacances' | 'stages_vacances' | 'cours_particuliers' | 'cours_groupe';

export interface RechargeState {
  typeCoursPrincipal: TypeCoursPrincipal;
  tailleGroupe: '' | 'duo' | '3_et_plus';
  typeForfait: string;
  /** null = sélection par défaut (toutes les vacances sauf l'été) */
  vacancesIncluses: string[] | null;
  matieres: MatiereChoisie[];
  hours: number;
  modePaiement: ModePaiement;
}

export const INITIAL_STATE: RechargeState = {
  typeCoursPrincipal: '',
  tailleGroupe: '',
  typeForfait: '',
  vacancesIncluses: null,
  matieres: [],
  hours: 10,
  modePaiement: 'comptant',
};

export const TYPE_LABELS: Record<string, string> = {
  cours_hors_vacances: "Cours pendant l'année scolaire hors vacances",
  cours_avec_vacances: "Cours pendant l'année scolaire y compris les vacances",
  stages_vacances: 'Stages pendant les vacances',
  cours_particuliers: 'Cours particuliers',
  cours_groupe: 'Cours en petits groupes',
};

export const STAGE_OPTIONS = [
  { value: 'soutien_scolaire', label: 'Cours particuliers' },
  { value: 'soutien_scolaire_collectif', label: 'Cours collectifs en petits groupes' },
];

export interface RechargeData {
  user: FullUser;
  forfaits: Forfait[];
  typesCours: TypeCours[];
  parametres: Parametre[];
  stages: Stage[];
  /** Vacances de la zone, de cette semaine au 31 août */
  holidays: SchoolHoliday[];
  zone: string | null;
}

/** Profil + formules + vacances scolaires de la zone de l'élève. */
export function useRechargeData() {
  const userQ = useFullUser();
  const user = userQ.data;
  const classe = user?.userClasses?.[0]?.classe;

  const formuleQ = useQuery({
    queryKey: ['formule', classe?.id],
    queryFn: () => api.formule({ id: classe!.id }),
    enabled: !!classe?.id,
    staleTime: 5 * 60_000,
  });

  const zoneQ = useQuery({
    queryKey: ['school-zone', user?.id, user?.schoolZoneFinal, user?.postalCode],
    enabled: !!user,
    staleTime: 3600_000,
    queryFn: async () => user!.schoolZoneFinal || user!.schoolZoneDetected || (user!.postalCode ? await api.schoolZone(user!.postalCode) : null),
  });
  const zone = zoneQ.data ?? null;

  const holidaysQ = useQuery({
    queryKey: ['school-holidays', zone],
    enabled: !!zone,
    staleTime: 3600_000,
    queryFn: async () => {
      const start = getWeekStart(new Date());
      const list = await api.schoolHolidays(zone!, start, getSchoolYearEndDate(new Date()));
      return [...list].sort((a, b) => a.start_date.localeCompare(b.start_date));
    },
  });

  const data: RechargeData | null =
    user && formuleQ.data ? { user, ...formuleQ.data, holidays: holidaysQ.data ?? [], zone } : null;

  return {
    data,
    classe,
    isLoading: userQ.isLoading || (!!classe?.id && formuleQ.isLoading),
    holidaysLoading: zoneQ.isLoading || (!!zone && holidaysQ.isLoading),
    error: (userQ.error || formuleQ.error) as Error | null,
    refetchUser: userQ.refetch,
  };
}

/** Matières du profil de l'élève, au format du wizard. */
export function profileMatieres(user: FullUser | undefined) {
  return (user?.matieres ?? []).map((m) => ({ id: String(m.matiere.id), nom: m.matiere.nom }));
}

/** Tous les montants du wizard, calculés comme NosFormulesMainDetails.js. */
export function useRechargeComputation(st: RechargeState, d: RechargeData | null) {
  return useMemo(() => {
    if (!d) return null;
    const { user, forfaits, typesCours, parametres, stages, holidays } = d;
    const niveauNom = user.userClasses?.[0]?.classe?.niveau?.nom;
    const classeNom = user.userClasses?.[0]?.classe?.nom;
    const isSuperieur = niveauNom === 'Supérieur';
    const isAvec = st.typeCoursPrincipal === 'cours_avec_vacances';
    const isHors = st.typeCoursPrincipal === 'cours_hors_vacances';
    const hasAbonnement = isAvec || isHors;
    const isStage = st.typeCoursPrincipal === 'stages_vacances';
    const today = isoDay();

    // Vacances proposées pour « y compris les vacances » (celles qui ne sont pas terminées)
    const vacancesDisponibles = holidays.filter((h) => h.end_date >= today);
    const vacancesAffichees = vacancesDisponibles.filter((h) => getHolidayShortLabel(h));

    const weeks = hasAbonnement
      ? computePackWeeks({ horsVacances: isHors, holidays: isHors ? holidays : vacancesDisponibles, includedIds: st.vacancesIncluses })
      : 0;

    // Forfait par nombre d'heures (supérieur)
    const currentForfait =
      isSuperieur && !hasAbonnement && !isStage
        ? forfaits.find((f) => f.niveau === 'superieur' && st.hours >= (f.heureMin ?? 0) && (f.heureMax ? st.hours <= f.heureMax : true)) ?? null
        : null;

    const selectedOption = typesCours.find((o) => o.value === st.typeForfait);
    let prixHoraire = 0;
    if (selectedOption) {
      prixHoraire =
        typeof selectedOption.price === 'object' && selectedOption.price
          ? (classeNom && selectedOption.price[classeNom]) || 0
          : Number(selectedOption.price) || 0;
      if (currentForfait?.nom === 'Performance') prixHoraire += parametrePrice(parametres, 'majoration_prix_performance_vs_coup_de_pouce');
      if (currentForfait?.nom === 'Excellence') prixHoraire += parametrePrice(parametres, 'majoration_prix_excellence_vs_coup_de_pouce');
      if (currentForfait && st.tailleGroupe === 'duo') prixHoraire += parametrePrice(parametres, 'majoration_prix_duo_vs_uno');
      if (currentForfait && st.tailleGroupe === '3_et_plus') prixHoraire += parametrePrice(parametres, 'majoration_prix_groupe_vs_uno');
    }

    const prixSansReduction = packPrice(st.matieres, weeks, prixHoraire);
    let calculatePrice = 0;
    if (hasAbonnement) calculatePrice = prixSansReduction;
    else if (isStage) calculatePrice = stagePrice(stages[0], st.typeForfait, st.matieres.length, prixHoraire);
    else if (st.typeCoursPrincipal) calculatePrice = st.hours * prixHoraire;

    const alma = Object.fromEntries(
      ALMA_MODES.map((mode) => {
        const majoration = getMajoration(parametres, mode);
        const montant = packPrice(st.matieres, weeks, prixHoraire + majoration);
        return [mode, { majoration, montant, eligible: hasAbonnement && isModePaiementEligible({ parametres, mode, montantTotal: montant, semainesRestantes: weeks }) }];
      }),
    ) as Record<'alma4x' | 'alma10x' | 'alma12x', { majoration: number; montant: number; eligible: boolean }>;

    const mode: ModePaiement = hasAbonnement && st.modePaiement !== 'comptant' && alma[st.modePaiement]?.eligible ? st.modePaiement : 'comptant';
    const isAlma = mode !== 'comptant';
    const montantAujourdhui = isAlma ? alma[mode].montant : calculatePrice;
    const montantCredite = montantAujourdhui;
    const fraisDossier = user.inscriptionFees === 'Pending' ? parametrePrice(parametres, 'frais_inscription') : 0;
    const total = montantAujourdhui + fraisDossier;
    const heures = hasAbonnement ? packHours(st.matieres, weeks) : isStage ? (stages[0]?.nbrHours ?? 0) * st.matieres.length : st.hours;
    const validityMonths = getPackValidityMonths();

    const forfaitAbonnement = hasAbonnement ? resolveForfait(forfaits, user.forfait, niveauNom) : null;
    const formuleAffichee = forfaitAbonnement
      ? {
          value: forfaitAbonnement.value,
          nom: forfaitAbonnement.nom,
          validite: forfaitAbonnement.echeance ?? '',
          description: forfaitAbonnement.description ?? '',
          avantages: forfaitAbonnement.avantages ?? [],
          duree: forfaitAbonnement.duree ?? '',
        }
      : null;
    const formuleId = hasAbonnement ? formuleIdFor(forfaitAbonnement?.value) : 'mensuelle';

    const typeCoursLabel = st.typeForfait === 'soutien_scolaire' ? 'Cours particuliers' : 'Cours collectifs en petits groupes';
    const recapRows: [string, string][] = [];
    let recap = 'RÉCAPITULATIF DE LA COMMANDE\n\n';
    const fmt = (n: number) => n.toFixed(2);
    if (isStage) {
      recap += `Type de besoin: Stages pendant les vacances\nType de cours: ${typeCoursLabel}\nNombre de matières: ${st.matieres.length} matière(s)\n`;
      if (st.matieres.length) recap += `Détails matières: ${st.matieres.map((m) => m.nom).join(', ')}\n`;
      recap += `Niveau: ${classeNom || 'Non spécifié'}\nMontant: ${fmt(montantAujourdhui)} EUR\n`;
      recapRows.push(['Type de besoin', 'Stages pendant les vacances'], ['Type de cours', typeCoursLabel]);
      recapRows.push(['Matières', `${st.matieres.length > 3 ? '3 matières et +' : `${st.matieres.length} matière${st.matieres.length > 1 ? 's' : ''}`} (${st.matieres.map((m) => m.nom).join(', ')})`]);
      recapRows.push(['Niveau', classeNom ?? '']);
    } else if (!hasAbonnement) {
      const typeLabel = st.typeCoursPrincipal === 'cours_particuliers' ? 'Cours particuliers' : `Cours collectifs en petits groupes (${st.tailleGroupe})`;
      recap += `Type: ${typeLabel}\n`;
      if (currentForfait) recap += `Forfait: ${currentForfait.nom}\n`;
      recap += `Objet: ${selectedOption?.label ?? ''}\nQuantité: ${st.hours} Heures\nValidité: ${currentForfait?.echeance || 'Non spécifiée'}\nMontant: ${fmt(montantAujourdhui)} EUR\n`;
      recapRows.push(['Type', typeLabel]);
      if (currentForfait) recapRows.push(['Forfait', currentForfait.nom]);
      recapRows.push(['Objet', selectedOption?.label ?? ''], ['Quantité', `${st.hours} heures`]);
      if (currentForfait?.echeance) recapRows.push(['Validité', currentForfait.echeance]);
    } else {
      const details = st.matieres.map((m) => `${m.nom} (${m.duree}H, ${frequenceOf(m)}/sem)`).join(', ');
      recap += `Type de besoin: ${TYPE_LABELS[st.typeCoursPrincipal]}\nType de cours: ${typeCoursLabel}\nNombre de matières: ${st.matieres.length} matière(s)\n`;
      if (st.matieres.length) recap += `Détails matières: ${details}\n`;
      recap += `Niveau: ${classeNom || 'Non spécifié'}\nNombre d'heures: ${Math.round(heures)} ${Math.round(heures) > 1 ? 'heures' : 'heure'}\n`;
      recap += `Nombre de semaines: ${weeks} ${weeks > 1 ? 'semaines' : 'semaine'}\nPrix formule: ${fmt(montantAujourdhui)} EUR\n`;
      recapRows.push(['Type de besoin', TYPE_LABELS[st.typeCoursPrincipal]], ['Type de cours', typeCoursLabel]);
      recapRows.push(['Matières', details], ['Niveau', classeNom ?? '']);
      recapRows.push(["Nombre d'heures", `${Math.round(heures)} ${Math.round(heures) > 1 ? 'heures' : 'heure'}`]);
      if (heures > 0) recapRows.push(['Prix/h', `${(montantAujourdhui / heures).toFixed(2).replace('.', ',')} €/h`]);
      recapRows.push(['Semaines restantes', `${weeks} ${weeks > 1 ? 'semaines' : 'semaine'}`]);
      if (formuleAffichee?.validite) recapRows.push(['Validité', /^\d+$/.test(formuleAffichee.validite.trim()) ? `${formuleAffichee.validite} mois` : formuleAffichee.validite]);
    }
    if (fraisDossier) recap += `Frais de dossier: ${fraisDossier} EUR\nMontant Total: ${fmt(total)} EUR\n`;
    recap += `Date transaction: ${new Date().toLocaleString('fr-FR')}\n`;

    /** Corps commun à la capture PayPal et à la création du paiement Alma. */
    const orderBody = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      amount: total,
      amountCharged: total,
      amountWithoutInscriptionFees: montantCredite,
      subject: st.typeForfait,
      forfaitValue: currentForfait?.value || formuleAffichee?.value || formuleId,
      typeCourValue: selectedOption?.value ?? '',
      balance: user.balance,
      priceHour: prixHoraire + (isAlma ? alma[mode].majoration : 0),
      recapTransaction: recap,
      niveau: niveauNom,
      echeancePCL: hasAbonnement ? validityMonths : undefined,
      modePaiement: hasAbonnement ? mode : 'comptant',
      nombreMensualites: hasAbonnement ? validityMonths : 1,
      montantTotalSansReduction: hasAbonnement ? prixSansReduction : montantAujourdhui,
    };

    return {
      isSuperieur,
      hasAbonnement,
      isStage,
      classeNom,
      vacancesDisponibles,
      vacancesAffichees,
      weeks,
      currentForfait,
      selectedOption,
      prixHoraire,
      prixSansReduction,
      calculatePrice,
      alma,
      mode,
      isAlma,
      montantAujourdhui,
      fraisDossier,
      total,
      heures,
      validityMonths,
      formuleAffichee,
      recap,
      recapRows,
      orderBody,
    };
  }, [st, d]);
}

export type RechargeComputation = NonNullable<ReturnType<typeof useRechargeComputation>>;
