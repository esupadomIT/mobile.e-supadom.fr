// Fuseau de la plateforme (Europe/Paris) : les créneaux sont saisis et affichés
// dans ce fuseau, comme sur le site (src/libs/timezone.js).

export const PLATFORM_TZ = 'Europe/Paris';

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(timeZone: string) {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  /** 0 = dimanche … 6 = samedi */
  weekday: number;
}

export function partsInTz(date: Date, timeZone = PLATFORM_TZ): DateParts {
  const parts = dtf(timeZone).formatToParts(date);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return {
    year,
    month,
    day,
    hour: get('hour') % 24,
    minute: get('minute'),
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

export function tzOffsetMs(date: Date, timeZone = PLATFORM_TZ) {
  const p = partsInTz(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, date.getUTCSeconds());
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Heure murale (dans `timeZone`) → instant UTC. */
export function zonedTimeToUtc(year: number, month: number, day: number, hours: number, minutes: number, timeZone = PLATFORM_TZ) {
  const naive = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  return new Date(naive - tzOffsetMs(new Date(naive), timeZone));
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Jour calendaire « YYYY-MM-DD » à Paris. */
export function isoDay(date: Date = new Date()) {
  const p = partsInTz(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

export function hhmm(date: Date) {
  const p = partsInTz(date);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function addDaysIso(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const u = new Date(Date.UTC(y, m - 1, d + days));
  return `${u.getUTCFullYear()}-${pad2(u.getUTCMonth() + 1)}-${pad2(u.getUTCDate())}`;
}

export function weekdayOfIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** « lundi 12 octobre » (ou « 12 octobre 2027 » avec l'année). */
export function formatIsoDay(iso: string, withYear = false) {
  const [y, m, d] = iso.split('-').map(Number);
  const base = `${WEEKDAYS[weekdayOfIso(iso)]} ${d} ${MONTHS[m - 1]}`;
  return withYear ? `${base} ${y}` : base;
}

export function monthLabel(year: number, month: number) {
  return `${MONTHS[month - 1][0].toUpperCase()}${MONTHS[month - 1].slice(1)} ${year}`;
}

/** Créneaux proposés par le site : 08:00 → 23:00 par demi-heure. */
export const SLOT_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 23; h++) {
    out.push(`${pad2(h)}:00`);
    if (h < 23) out.push(`${pad2(h)}:30`);
  }
  return out;
})();
