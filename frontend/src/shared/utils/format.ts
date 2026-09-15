const RELATIVE = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "hace 3 horas", "ayer", etc. */
export function timeAgo(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return RELATIVE.format(Math.round(diff / ms), unit);
  }
  return 'recién';
}

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(isoDate));
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
