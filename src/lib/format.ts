const time = new Intl.DateTimeFormat('fr-CA', { hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short' });

/** Heure si c'est aujourd'hui, sinon date courte. */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? time.format(d) : day.format(d);
}

export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}
