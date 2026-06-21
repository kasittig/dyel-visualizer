/** ISO calendar-day key (`YYYY-MM-DD`) used to bucket sessions by date. Uses local date components so the key matches the calendar day in any timezone. */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** A `key → (date → best value)` grid that keeps the maximum value seen per `(key, date)`. */
export type DateValueGrid = Map<string, Map<string, number>>;

/**
 * Records `value` at `(key, date)`, keeping only the maximum. Returns `true` when it became
 * the new best for that date, so callers can store companion data (e.g. the best set)
 * alongside the winning value.
 */
export function recordMax(grid: DateValueGrid, key: string, date: string, value: number): boolean {
  let byDate = grid.get(key);
  if (!byDate) {
    byDate = new Map();
    grid.set(key, byDate);
  }
  const prev = byDate.get(date);
  if (prev === undefined || value > prev) {
    byDate.set(date, value);
    return true;
  }
  return false;
}

/** Sorted union of every date across every key in the grid. */
export function sortedGridDates(grid: DateValueGrid): string[] {
  return [...new Set([...grid.values()].flatMap((m) => [...m.keys()]))].sort();
}
