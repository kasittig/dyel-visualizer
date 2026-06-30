import type { ConjugateDataPair } from '../../types/conjugate';

/** Local calendar-day key (`YYYY-MM-DD`) for a session date. Mirrors chart/chartGrid.ts's
 *  isoDate, reimplemented here since math/ cannot import from chart/. */
function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Total tonnage (sets * reps * weight) per calendar day across the given session pairs.
 * Callers are expected to pre-filter `pairs` to the sessions they want included
 * (e.g. accessory-only) — every pair passed in is summed, with no type filtering.
 */
export function calculateVolumeCorrelation(pairs: ConjugateDataPair[]): Map<string, number> {
  const volumeByDate = new Map<string, number>();
  for (const [, session] of pairs) {
    const key = localDateKey(session.date);
    const tonnage = session.sets * session.reps * session.weight;
    volumeByDate.set(key, (volumeByDate.get(key) ?? 0) + tonnage);
  }
  return volumeByDate;
}
