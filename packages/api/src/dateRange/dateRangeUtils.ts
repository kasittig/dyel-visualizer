import type { RenderParams } from '@dyel/pipeline';

/**
 * Date range preset identifier.
 */
export type PresetId = '2w' | '1m' | '3m' | 'all';

/**
 * Convert a date range to RenderParams for pipeline processing.
 *
 * @param from Start date (inclusive), or undefined for no lower bound
 * @param to End date (inclusive to end-of-day), or undefined for no upper bound
 * @returns RenderParams with dateRange [fromMs, toMs] if both defined, or empty object
 */
export function dateRangeToRenderParams(
  from: Date | undefined,
  to: Date | undefined
): RenderParams {
  if (from && to) {
    return { dateRange: [from.getTime(), to.getTime()] };
  }
  return {};
}

/**
 * Check if a record date falls within a date range.
 *
 * @param dateMs Record timestamp in milliseconds
 * @param from Start date (inclusive), or undefined for no lower bound
 * @param to End date (inclusive to end-of-day), or undefined for no upper bound
 * @returns true if the date falls within the range
 */
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

/**
 * Compute a preset date range.
 *
 * @param preset Preset identifier ('2w', '1m', '3m', 'all')
 * @param today Reference date (typically the most recent session or current date)
 * @returns Date range { from, to } for the preset
 */
export function presetDateRange(preset: PresetId, today: Date): { from: Date; to: Date } {
  switch (preset) {
    case '2w': {
      const from = new Date(today);
      from.setDate(from.getDate() - 14);
      return { from, to: today };
    }
    case '1m': {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 1);
      return { from, to: today };
    }
    case '3m': {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 3);
      return { from, to: today };
    }
    case 'all': {
      // 'all' without earliest boundary returns epoch as placeholder
      return { from: new Date(1970, 0, 1), to: today };
    }
  }
}

/**
 * Determine which preset, if any, matches the given date range.
 *
 * @param from Start date or undefined
 * @param to End date or undefined
 * @param today Reference date (typically the most recent session or current date)
 * @returns Matching PresetId, or null if no preset matches
 */
export function activePreset(
  from: Date | undefined,
  to: Date | undefined,
  today: Date
): PresetId | null {
  const toDateStr = to?.toDateString();

  // If to doesn't match today, it's not a preset
  if (toDateStr !== today.toDateString()) {
    return null;
  }

  // If from is undefined, it's the 'all' preset
  if (!from) {
    return 'all';
  }

  // Check '2w', '1m', '3m'
  const twoWeeks = presetDateRange('2w', today);
  if (from.toDateString() === twoWeeks.from.toDateString()) {
    return '2w';
  }

  const oneMonth = presetDateRange('1m', today);
  if (from.toDateString() === oneMonth.from.toDateString()) {
    return '1m';
  }

  const threeMonths = presetDateRange('3m', today);
  if (from.toDateString() === threeMonths.from.toDateString()) {
    return '3m';
  }

  return null;
}

/**
 * Compute a default date range from the last session date (3 months back).
 *
 * @param lastSessionDate Most recent session date
 * @returns Date range { from, to } with `from` set to 3 months before and `to` to the session date
 */
export function defaultDateRangeFromLastSession(lastSessionDate: Date): {
  from: Date;
  to: Date;
} {
  const from = new Date(
    lastSessionDate.getFullYear(),
    lastSessionDate.getMonth() - 3,
    lastSessionDate.getDate()
  );
  return { from, to: lastSessionDate };
}
