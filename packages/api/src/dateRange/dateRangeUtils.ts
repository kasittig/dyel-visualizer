import type { RenderParams } from '@dyel/pipeline';

export type PresetId = '2w' | '1m' | '3m' | 'all';

/**
 * Adds `monthOffset` months to a date, clamping the result to the last valid day
 * of the target month if the original day doesn't exist (e.g., Jan 31 + 1 month → Feb 28/29).
 */
function clampToMonth(date: Date, monthOffset: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setMonth(result.getMonth() + monthOffset);

  // If date overflowed into the next month, clamp to last day of target month
  if (result.getDate() !== originalDay) {
    result.setDate(0);
  }

  return result;
}

export function dateRangeToRenderParams(
  from: Date | undefined,
  to: Date | undefined
): RenderParams {
  return from && to ? { dateRange: [from.getTime(), to.getTime()] } : {};
}

export function isRecordInDateRange(
  dateMs: number,
  from: Date | undefined,
  to: Date | undefined
): boolean {
  if (from && dateMs < from.getTime()) {
    return false;
  }
  if (to) {
    const dayEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    if (dateMs > dayEnd.getTime()) {
      return false;
    }
  }
  return true;
}

export function presetDateRange(preset: PresetId, today: Date): { from: Date; to: Date } {
  let from = new Date(today);
  if (preset === '2w') {
    from.setDate(from.getDate() - 14);
  } else if (preset === '1m') {
    from = clampToMonth(from, -1);
  } else if (preset === '3m') {
    from = clampToMonth(from, -3);
  } else {
    return { from: new Date(1970, 0, 1), to: today };
  }
  return { from, to: today };
}

export function activePreset(
  from: Date | undefined,
  to: Date | undefined,
  today: Date
): PresetId | null {
  if (to?.toDateString() !== today.toDateString()) {
    return null;
  }
  if (!from || from.toDateString() === presetDateRange('all', today).from.toDateString()) {
    return 'all';
  }
  const presets: Exclude<PresetId, 'all'>[] = ['2w', '1m', '3m'];
  for (const id of presets) {
    if (from.toDateString() === presetDateRange(id, today).from.toDateString()) {
      return id;
    }
  }
  return null;
}

export function defaultDateRangeFromLastSession(lastSessionDate: Date): { from: Date; to: Date } {
  return {
    from: clampToMonth(lastSessionDate, -3),
    to: lastSessionDate,
  };
}
