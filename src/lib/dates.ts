/** Date helpers that work on ISO yyyy-mm-dd strings in UTC, so results never depend on the viewer's time zone. */

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime();
  return Math.round(ms / 86_400_000);
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function dateRange(start: string, endInclusive: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= endInclusive; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Swap the month and day parts (2026-06-04 → 2026-04-06) — used to detect DD/MM vs MM/DD import errors. */
export function swapMonthDay(iso: string): string | null {
  const [y, m, d] = iso.split('-');
  if (Number(d) > 12) return null;
  return `${y}-${d}-${m}`;
}
