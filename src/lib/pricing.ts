// Calcul des formules « Recharger mon compte », repris à l'identique du site
// (src/commons/schoolHolidays.js, src/commons/forfaits.js et
// NosFormulesMainDetails.js) pour afficher et payer les mêmes montants.

export interface SchoolHoliday {
  description?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  holiday_type?: string | null;
}

export interface Parametre {
  value: string;
  price?: number | null;
  nom?: string;
}

export interface TypeCours {
  id: number | string;
  value: string;
  label: string;
  /** Prix horaire : nombre, ou objet { [nom de classe]: prix } */
  price?: number | Record<string, number> | null;
  hideFor?: string[] | null;
}

export interface Forfait {
  id?: number | string;
  nom: string;
  value: string;
  niveau?: string;
  heureMin?: number;
  heureMax?: number | null;
  echeance?: string;
  duree?: string;
  description?: string;
  avantages?: string[];
  moisActifs?: number[];
}

export interface Stage {
  nbrHours?: number;
  price1matiere?: number | string;
  price2matiere?: number | string;
  price3matiere?: number | string;
}

export type ModePaiement = 'comptant' | 'alma4x' | 'alma10x' | 'alma12x';
export const ALMA_MODES: ModePaiement[] = ['alma4x', 'alma10x', 'alma12x'];
export const ALMA_INSTALLMENTS: Record<string, number> = { alma4x: 4, alma10x: 10, alma12x: 12 };

const DAY = 24 * 3600 * 1000;

// ─── Vacances scolaires / semaines du pack ────────────────────────────────

export function getSchoolHolidayId(h: SchoolHoliday) {
  return `${h?.description || ''}__${h?.start_date || ''}`;
}

function normalizeType(type?: string | null) {
  return (type || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function isVacanceEte(h: SchoolHoliday) {
  if (normalizeType(h?.holiday_type) === 'ete') return true;
  return (h?.description || '').toLowerCase().includes('été');
}

const SHORT_LABELS: Record<string, string> = { toussaint: 'Toussaint', noel: 'Noël', hiver: 'Hiver', printemps: 'Printemps', ete: 'Été' };
const LABEL_PATTERNS: [string, RegExp][] = [
  ['toussaint', /toussaint/i],
  ['noel', /no[eë]l/i],
  ['hiver', /hiver/i],
  ['printemps', /printemps/i],
  ['ete', /\bét[eé]\b/i],
];

export function getHolidayShortLabel(h: SchoolHoliday): string | null {
  const byType = SHORT_LABELS[normalizeType(h?.holiday_type)];
  if (byType) return byType;
  if (h?.holiday_type) return null;
  const found = LABEL_PATTERNS.find(([, re]) => re.test(h?.description || ''));
  return found ? SHORT_LABELS[found[0]] : null;
}

export function getDefaultIncludedHolidayIds(holidays: SchoolHoliday[]) {
  return (holidays || []).filter((h) => !isVacanceEte(h)).map(getSchoolHolidayId);
}

export function getWeekStart(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

/** 30 juin de l'année scolaire en cours. */
export function getPackYearEndDate(date = new Date()) {
  const year = date.getUTCFullYear();
  const endYear = date.getUTCMonth() <= 5 ? year : year + 1;
  return new Date(Date.UTC(endYear, 5, 30, 23, 59, 59, 999));
}

/** 31 août de l'année scolaire en cours. */
export function getSchoolYearEndDate(date = new Date()) {
  const year = date.getUTCFullYear();
  const endYear = date.getUTCMonth() >= 8 ? year + 1 : year;
  return new Date(Date.UTC(endYear, 7, 31, 23, 59, 59, 999));
}

export function getPackWeeksRemaining(date = new Date()) {
  const diff = getPackYearEndDate(date).getTime() - getWeekStart(date).getTime();
  return Math.max(diff / (7 * DAY), 0);
}

export function getPackValidityMonths(date = new Date()) {
  const end = getPackYearEndDate(date);
  let months = (end.getUTCFullYear() - date.getUTCFullYear()) * 12 + (end.getUTCMonth() - date.getUTCMonth());
  if (end.getUTCDate() >= date.getUTCDate()) months += 1;
  return Math.max(months, 1);
}

function countHolidayCalendarWeeks(holidays: SchoolHoliday[], start: Date, end: Date) {
  if (!holidays?.length) return 0;
  let count = 0;
  let cursor = getWeekStart(start);
  while (cursor.getTime() < end.getTime()) {
    const c = cursor;
    if (holidays.some((h) => c >= new Date(`${h.start_date}T00:00:00.000Z`) && c < new Date(`${h.end_date}T00:00:00.000Z`))) count += 1;
    cursor = new Date(cursor.getTime() + 7 * DAY);
  }
  return count;
}

/**
 * Semaines restantes facturées (S) :
 * - hors vacances : toutes les semaines de vacances sont retirées ;
 * - avec vacances : seules les vacances décochées sont retirées.
 */
export function computePackWeeks({
  horsVacances,
  holidays,
  includedIds,
  now = new Date(),
}: {
  horsVacances: boolean;
  holidays: SchoolHoliday[];
  includedIds?: string[] | null;
  now?: Date;
}) {
  const start = getWeekStart(now);
  const end = getPackYearEndDate(start);
  const total = getPackWeeksRemaining(start);
  if (!holidays.length) return Math.ceil(total);
  const excludedList = horsVacances
    ? holidays
    : holidays.filter((h) => !(includedIds ?? getDefaultIncludedHolidayIds(holidays)).includes(getSchoolHolidayId(h)));
  return Math.ceil(Math.max(total - countHolidayCalendarWeeks(excludedList, start, end), 0));
}

// ─── Paramètres / Alma ─────────────────────────────────────────────────────

export function parametrePrice(parametres: Parametre[], value: string): number {
  return Number(parametres.find((p) => p.value === value)?.price ?? 0) || 0;
}

const MAJORATION_KEYS: Record<string, string> = { alma4x: 'paiement_alma_4_fois', alma10x: 'paiement_alma_10_fois', alma12x: 'paiement_alma_12_fois' };
const MINIMUM_KEYS: Record<string, string> = { alma4x: 'montant_minimum_alma_4_fois', alma10x: 'montant_minimum_alma_10_fois', alma12x: 'montant_minimum_alma_12_fois' };
const MINIMUM_FALLBACK: Record<string, number> = { alma4x: 300, alma10x: 800, alma12x: 1500 };

export function getMajoration(parametres: Parametre[], mode: string) {
  const key = MAJORATION_KEYS[mode];
  return key ? parametrePrice(parametres, key) : 0;
}

function getMontantMinimum(parametres: Parametre[], mode: string) {
  const key = MINIMUM_KEYS[mode];
  const fallback = MINIMUM_FALLBACK[mode] || 0;
  const found = key ? parametres.find((p) => p.value === key) : undefined;
  return found ? Number(found.price ?? fallback) : fallback;
}

function getSemainesMinimum(mode: string) {
  if (mode === 'alma10x') return 25;
  const n = ALMA_INSTALLMENTS[mode];
  return n ? Math.ceil(0.8 * (52 / 12) * n) : 0;
}

export function isModePaiementEligible({
  parametres,
  mode,
  montantTotal,
  semainesRestantes,
  now = new Date(),
}: {
  parametres: Parametre[];
  mode: ModePaiement;
  montantTotal: number;
  semainesRestantes: number;
  now?: Date;
}) {
  if (mode === 'comptant') return true;
  const n = ALMA_INSTALLMENTS[mode];
  if (!n) return false;
  if ((montantTotal || 0) < getMontantMinimum(parametres, mode)) return false;
  if ((semainesRestantes || 0) < getSemainesMinimum(mode)) return false;
  const last = new Date(now);
  last.setUTCMonth(last.getUTCMonth() + (n - 1));
  const capYear = getPackYearEndDate(now).getUTCFullYear();
  const cap = n === 12 ? new Date(Date.UTC(capYear, 7, 31, 23, 59, 59, 999)) : new Date(Date.UTC(capYear, 6, 31, 23, 59, 59, 999));
  return last <= cap;
}

// ─── Forfait affiché (formules abonnement) ─────────────────────────────────

const FORFAIT_PAR_DEFAUT = 'coup_de_pouce';
const FORMULE_ID: Record<string, string> = { decouverte: 'mensuelle', coup_de_pouce: 'trimestrielle', performance: 'semestrielle', excellence: 'annuelle' };

function monthInParis(date = new Date()) {
  return Number(new Intl.DateTimeFormat('fr-FR', { month: 'numeric', timeZone: 'Europe/Paris' }).format(date));
}

/** Forfait de l'élève, sinon celui du mois pour son niveau (voir useResolvedFormule du site). */
export function resolveForfait(forfaits: Forfait[], userForfait: string | null | undefined, niveauNom: string | undefined) {
  if (userForfait) {
    const match = forfaits.find((f) => f.value === userForfait);
    if (match) return match;
  }
  const bucket = niveauNom === 'Supérieur' ? 'superieur' : 'pcl';
  const ofBucket = forfaits.filter((f) => f.niveau === bucket);
  const mois = monthInParis();
  const fallback = bucket === 'pcl' ? `${FORFAIT_PAR_DEFAUT}_PCL` : FORFAIT_PAR_DEFAUT;
  const value = ofBucket.find((f) => Array.isArray(f.moisActifs) && f.moisActifs.includes(mois))?.value || fallback;
  return ofBucket.find((f) => f.value === value) || ofBucket[0] || forfaits[0] || null;
}

export function formuleIdFor(forfaitValue?: string | null) {
  if (!forfaitValue) return FORMULE_ID[FORFAIT_PAR_DEFAUT];
  return FORMULE_ID[forfaitValue.replace(/_PCL$/i, '')] || FORMULE_ID[FORFAIT_PAR_DEFAUT];
}

// ─── Montants ─────────────────────────────────────────────────────────────

export interface MatiereChoisie {
  id: string;
  nom: string;
  duree: string; // '1' | '1.5' | '2'
  frequence: string; // '1' | '2' | 'autre'
  autreFrequence: string;
}

export function frequenceOf(m: MatiereChoisie) {
  return m.frequence === 'autre' ? m.autreFrequence || '0' : m.frequence || '0';
}

/** Heures totales du pack (Σ durée × fréquence × S). */
export function packHours(matieres: MatiereChoisie[], weeks: number) {
  return matieres.reduce((t, m) => t + parseFloat(m.duree || '0') * parseFloat(frequenceOf(m)) * weeks, 0);
}

/** Prix d'un pack abonnement pour un prix horaire (fréquence entière, comme le site). */
export function packPrice(matieres: MatiereChoisie[], weeks: number, prixHoraire: number) {
  return matieres.reduce((t, m) => t + weeks * (parseInt(frequenceOf(m), 10) || 0) * parseFloat(m.duree || '0') * prixHoraire, 0);
}

/** Prix d'un stage pendant les vacances. */
export function stagePrice(stage: Stage | undefined, typeForfait: string, nbMatieres: number, prixHoraire: number) {
  if (!stage) return 0;
  if (typeForfait === 'soutien_scolaire') return (stage.nbrHours || 0) * prixHoraire * nbMatieres;
  const p1 = parseFloat(String(stage.price1matiere ?? 0)) || 0;
  const p2 = parseFloat(String(stage.price2matiere ?? 0)) || 0;
  const p3 = parseFloat(String(stage.price3matiere ?? 0)) || 0;
  if (nbMatieres === 1) return p1;
  if (nbMatieres === 2) return p2;
  if (nbMatieres === 3) return p3;
  if (nbMatieres > 3) return p3 > 0 ? (p3 / 3) * nbMatieres : Math.max(p1, p2 > 0 ? p2 / 2 : 0, p3 > 0 ? p3 / 3 : 0) * nbMatieres;
  return 0;
}

export const euros = (n: number) =>
  `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export const round2 = (n: number) => Math.round((n || 0) * 100) / 100;
