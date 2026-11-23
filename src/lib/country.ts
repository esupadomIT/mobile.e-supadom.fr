import { getCountryCallingCode, isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';

/**
 * Pays du téléphone, du code postal et de la ville (comme le site : drapeau
 * du champ téléphone, France par défaut). Le pays choisi pour le téléphone
 * fixe aussi le format du code postal et la recherche de la ville.
 */

export const DEFAULT_COUNTRY: CountryCode = 'FR';

/** Pays proposés (noms en français). France et Tunisie en tête, puis ordre alphabétique. */
const NAMES: Partial<Record<CountryCode, string>> = {
  FR: 'France', TN: 'Tunisie', DZ: 'Algérie', MA: 'Maroc', BE: 'Belgique', CH: 'Suisse', LU: 'Luxembourg', MC: 'Monaco',
  CA: 'Canada', US: 'États-Unis', GB: 'Royaume-Uni', IE: 'Irlande', DE: 'Allemagne', AT: 'Autriche', ES: 'Espagne',
  PT: 'Portugal', IT: 'Italie', NL: 'Pays-Bas', DK: 'Danemark', SE: 'Suède', NO: 'Norvège', FI: 'Finlande', PL: 'Pologne',
  CZ: 'Tchéquie', RO: 'Roumanie', GR: 'Grèce', HR: 'Croatie', HU: 'Hongrie', BG: 'Bulgarie', TR: 'Turquie', RU: 'Russie',
  UA: 'Ukraine', GP: 'Guadeloupe', MQ: 'Martinique', GF: 'Guyane', RE: 'La Réunion', YT: 'Mayotte',
  PM: 'Saint-Pierre-et-Miquelon', NC: 'Nouvelle-Calédonie', PF: 'Polynésie française', LY: 'Libye', EG: 'Égypte',
  MR: 'Mauritanie', SN: 'Sénégal', ML: 'Mali', CI: 'Côte d’Ivoire', BF: 'Burkina Faso', NE: 'Niger', TG: 'Togo', BJ: 'Bénin',
  GN: 'Guinée', CM: 'Cameroun', GA: 'Gabon', CG: 'Congo', CD: 'RD Congo', MG: 'Madagascar', MU: 'Maurice', DJ: 'Djibouti',
  KM: 'Comores', TD: 'Tchad', CF: 'Centrafrique', RW: 'Rwanda', BI: 'Burundi', HT: 'Haïti', LB: 'Liban', SY: 'Syrie',
  JO: 'Jordanie', SA: 'Arabie saoudite', AE: 'Émirats arabes unis', QA: 'Qatar', KW: 'Koweït', BH: 'Bahreïn', OM: 'Oman',
  IL: 'Israël', PS: 'Palestine', IQ: 'Irak', IR: 'Iran', IN: 'Inde', PK: 'Pakistan', CN: 'Chine', JP: 'Japon',
  KR: 'Corée du Sud', VN: 'Viêt Nam', TH: 'Thaïlande', BR: 'Brésil', MX: 'Mexique', AR: 'Argentine', CO: 'Colombie',
  AU: 'Australie', NZ: 'Nouvelle-Zélande', ZA: 'Afrique du Sud', NG: 'Nigeria',
};

export interface Country {
  iso: CountryCode;
  name: string;
  dial: string;
  flag: string;
}

const flagOf = (iso: string) => String.fromCodePoint(...[...iso.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

export function countryOf(iso: CountryCode): Country {
  let dial = '';
  try {
    dial = getCountryCallingCode(iso);
  } catch {
    dial = '';
  }
  return { iso, name: NAMES[iso] ?? iso, dial, flag: flagOf(iso) };
}

const PINNED: CountryCode[] = ['FR', 'TN'];
export const COUNTRIES: Country[] = [
  ...PINNED.map(countryOf),
  ...(Object.keys(NAMES) as CountryCode[])
    .filter((iso) => !PINNED.includes(iso))
    .map(countryOf)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
];

// ─── Téléphone ──────────────────────────────────────────────────────────────

/** Exemple affiché dans le champ selon le pays. */
export function phonePlaceholder(iso: CountryCode) {
  return ({ FR: '06 12 34 56 78', TN: '20 123 456', BE: '0470 12 34 56', CH: '078 123 45 67', MA: '0612 345678', DZ: '0551 23 45 67', CA: '514 123 4567' } as Partial<Record<CountryCode, string>>)[iso] ?? '';
}

export function isValidPhone(iso: CountryCode, national: string) {
  try {
    return isValidPhoneNumber(national.trim(), iso);
  } catch {
    return false;
  }
}

/**
 * Format enregistré, identique au site (react-phone-input-2) : indicatif +
 * numéro, chiffres seuls, sans « + » ni 0 initial. Ex. « 33612345678 ».
 */
export function phoneToStore(iso: CountryCode, national: string) {
  const digits = national.replace(/\D/g, '');
  if (!digits) return '';
  const parsed = parsePhoneNumberFromString(national.trim(), iso);
  if (parsed) return parsed.number.replace(/^\+/, '');
  return `${countryOf(iso).dial}${digits.replace(/^0+/, '')}`;
}

/** Inverse de phoneToStore, tolérant aux anciens formats (« 06… », « +33… », « 0033… »). */
export function phoneFromStore(stored: string | null | undefined): { country: CountryCode; national: string } {
  let s = (stored ?? '').trim();
  if (!s) return { country: DEFAULT_COUNTRY, national: '' };
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (!s.startsWith('+') && s.startsWith('0')) return { country: DEFAULT_COUNTRY, national: s };
  const parsed = parsePhoneNumberFromString(s.startsWith('+') ? s : `+${s.replace(/\D/g, '')}`);
  if (parsed?.country) return { country: parsed.country, national: parsed.formatNational() };
  return { country: DEFAULT_COUNTRY, national: s };
}

// ─── Code postal / ville ───────────────────────────────────────────────────

export interface PostalRule {
  /** Longueur maximale saisie. */
  max: number;
  re: RegExp;
  placeholder: string;
  numeric: boolean;
  /** Message d'erreur de format (comme le site : « 5 chiffres requis. »). */
  hint: string;
}

const digits = (n: number, placeholder: string): PostalRule => ({
  max: n, re: new RegExp(`^\\d{${n}}$`), placeholder, numeric: true, hint: `${n} chiffres requis.`,
});
const pattern = (re: RegExp, max: number, placeholder: string): PostalRule => ({
  max, re, placeholder, numeric: false, hint: `Format attendu : ${placeholder}.`,
});

const POSTAL: Partial<Record<CountryCode, PostalRule>> = {
  FR: digits(5, '75001'), GP: digits(5, '97100'), MQ: digits(5, '97200'), GF: digits(5, '97300'), RE: digits(5, '97400'),
  YT: digits(5, '97600'), PM: digits(5, '97500'), NC: digits(5, '98800'), PF: digits(5, '98700'), MC: digits(5, '98000'),
  TN: digits(4, '1000'), DZ: digits(5, '16000'), MA: digits(5, '20000'), BE: digits(4, '1000'), CH: digits(4, '1200'),
  LU: digits(4, '1009'), AT: digits(4, '1010'), DK: digits(4, '1050'), NO: digits(4, '0150'), HU: digits(4, '1051'),
  BG: digits(4, '1000'), DE: digits(5, '10115'), ES: digits(5, '28001'), IT: digits(5, '00118'), GR: digits(5, '10431'),
  FI: digits(5, '00100'), HR: digits(5, '10000'), TR: digits(5, '34000'), US: digits(5, '10001'), SN: digits(5, '10200'),
  SA: digits(5, '11564'), EG: digits(5, '11511'), MX: digits(5, '06000'), RO: digits(6, '010011'), RU: digits(6, '101000'),
  IN: digits(6, '110001'), CN: digits(6, '100000'), UA: digits(5, '01001'), AU: digits(4, '2000'), NZ: digits(4, '6011'),
  ZA: digits(4, '0001'), LB: digits(4, '1100'),
  PT: pattern(/^\d{4}-\d{3}$/, 8, '1000-001'),
  PL: pattern(/^\d{2}-\d{3}$/, 6, '00-001'),
  CZ: pattern(/^\d{3} ?\d{2}$/, 6, '110 00'),
  SE: pattern(/^\d{3} ?\d{2}$/, 6, '111 22'),
  NL: pattern(/^\d{4} ?[A-Z]{2}$/i, 7, '1011 AB'),
  CA: pattern(/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i, 7, 'H2X 1Y4'),
  GB: pattern(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, 8, 'SW1A 1AA'),
  BR: pattern(/^\d{5}-?\d{3}$/, 9, '01000-000'),
  JP: pattern(/^\d{3}-?\d{4}$/, 8, '100-0001'),
};

const FREE: PostalRule = pattern(/^[A-Z0-9][A-Z0-9 -]{1,9}$/i, 10, '');

export function postalRule(iso: CountryCode): PostalRule {
  return POSTAL[iso] ?? { ...FREE, hint: 'Code postal invalide.' };
}

/** Nettoie la saisie (chiffres seuls si le format est numérique). */
export function cleanPostal(iso: CountryCode, v: string) {
  const rule = postalRule(iso);
  const s = rule.numeric ? v.replace(/\D/g, '') : v.toUpperCase().replace(/[^A-Z0-9 -]/g, '');
  return s.slice(0, rule.max);
}

export const isPostalComplete = (iso: CountryCode, code: string) => postalRule(iso).re.test(code.trim());

/** Pays dont la ville est trouvée par l'API Géo de l'État (comme le site) : ville non modifiable. */
export const usesFrenchGeo = (iso: CountryCode) => ['FR', 'GP', 'MQ', 'GF', 'RE', 'YT'].includes(iso);

/** Pays couverts par api.zippopotam.us (ville proposée, modifiable). */
const ZIPPO = new Set<CountryCode>(['BE', 'CH', 'LU', 'MC', 'DE', 'AT', 'ES', 'PT', 'IT', 'NL', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'HU', 'BG', 'HR', 'TR', 'US', 'CA', 'GB', 'MX', 'BR', 'JP', 'IN', 'AU', 'NZ', 'ZA', 'RU', 'PM']);
export const hasCityLookup = (iso: CountryCode) => usesFrenchGeo(iso) || ZIPPO.has(iso);

/** Ville d'un code postal étranger (null si inconnue). */
export async function foreignCityOf(iso: CountryCode, code: string): Promise<string | null> {
  if (!ZIPPO.has(iso)) return null;
  let q = code.trim().toUpperCase();
  if (iso === 'CA') q = q.slice(0, 3);
  if (iso === 'GB') q = q.replace(/\s+/g, '').slice(0, -3);
  try {
    const res = await fetch(`https://api.zippopotam.us/${iso.toLowerCase()}/${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { places?: { 'place name'?: string }[] };
    return data.places?.[0]?.['place name'] ?? null;
  } catch {
    return null;
  }
}

/** Erreur de validation code postal + ville (null si tout est bon). */
export function postalCityError(iso: CountryCode, postalCode: string, city: string): string | null {
  if (!postalCode.trim()) return 'Renseignez le code postal.';
  if (!isPostalComplete(iso, postalCode)) return `Code postal invalide : ${postalRule(iso).hint}`;
  if (!city.trim()) return usesFrenchGeo(iso) ? 'Veuillez entrer un code postal valide.' : 'Renseignez la ville.';
  return null;
}
