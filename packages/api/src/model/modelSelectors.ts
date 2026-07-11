import type { LiftType, TaggedSetRecord } from '@dyel/pipeline';
import type { SplitRows } from '../sheet/parseSheetData';
import { isRecordInDateRange } from '../dateRange/dateRangeUtils';
import { defaultCompExerciseCanonical } from '../sheet/defaultExercise';

const LIFT_TABS: LiftType[] = ['squat', 'bench', 'deadlift', 'accessory'];

/**
 * Detect the data unit (lbs or kg) from the first record with meta.rawUnit.
 * Falls back to 'lbs' if no rawUnit is found.
 *
 * @param tabRows Grouped records by lift type
 * @returns 'lbs' or 'kg'
 */
export function detectDataUnit(tabRows: Record<LiftType, SplitRows>): 'lbs' | 'kg' {
  for (const liftType of LIFT_TABS) {
    for (const rec of tabRows[liftType].all) {
      if (rec.meta?.rawUnit) {
        return (rec.meta.rawUnit === 'lbs' ? 'lbs' : 'kg') as 'lbs' | 'kg';
      }
    }
  }
  return 'lbs';
}

/**
 * Collect all session dates and the most recent session date from maxEffort records.
 * Deduplicates dates by calendar day.
 *
 * @param tabRows Grouped records by lift type
 * @returns Object with allSessionDates (sorted, unique by day) and lastSessionDate (most recent)
 */
export function collectSessionDates(tabRows: Record<LiftType, SplitRows>): {
  allSessionDates: Date[];
  lastSessionDate: Date | null;
} {
  const allRecords = [
    ...tabRows.squat.maxEffort,
    ...tabRows.bench.maxEffort,
    ...tabRows.deadlift.maxEffort,
    ...tabRows.accessory.maxEffort,
  ];

  const seen = new Set<string>();
  const dates: Date[] = [];
  let last: Date | null = null;

  for (const rec of allRecords) {
    const recDate = new Date(rec.date);
    if (!last || recDate > last) {
      last = recDate;
    }
    const key = recDate.toDateString();
    if (!seen.has(key)) {
      seen.add(key);
      dates.push(recDate);
    }
  }

  return { allSessionDates: dates, lastSessionDate: last };
}

/**
 * Collect all volume records from all lift types.
 *
 * @param tabRows Grouped records by lift type
 * @returns Flattened array of all volume records
 */
export function collectVolumeRecords(tabRows: Record<LiftType, SplitRows>): TaggedSetRecord[] {
  return [
    ...tabRows.squat.volume,
    ...tabRows.bench.volume,
    ...tabRows.deadlift.volume,
    ...tabRows.accessory.volume,
  ];
}

/**
 * Compute default competition exercise canonicals for each lift type.
 * Uses a single loop to determine the canonical for each lift, applying
 * the same defaultCompExerciseCanonical logic to all lifts.
 *
 * @param tabRows Grouped records by lift type
 * @param deadliftStance User's preferred deadlift stance ('sumo' or 'conventional')
 * @returns Partial record mapping lift types to their default canonical (omits lifts with null canonical)
 */
export function defaultCanonicalsByLift(
  tabRows: Record<LiftType, SplitRows>,
  deadliftStance: string
): Partial<Record<LiftType, string>> {
  const result: Partial<Record<LiftType, string>> = {};

  for (const liftType of LIFT_TABS) {
    const canonical = defaultCompExerciseCanonical(tabRows[liftType].all, deadliftStance);
    if (canonical) {
      result[liftType] = canonical;
    }
  }

  return result;
}

/**
 * Determine which lift types have records within the given date range.
 * A lift type is visible if it has at least one record within [from, to].
 *
 * @param tabRows Grouped records by lift type
 * @param from Start date (inclusive), or undefined for no lower bound
 * @param to End date (inclusive to end-of-day), or undefined for no upper bound
 * @returns Array of visible lift types in order (squat, bench, deadlift, accessory)
 */
export function visibleLiftTypes(
  tabRows: Record<LiftType, SplitRows>,
  from: Date | undefined,
  to: Date | undefined
): LiftType[] {
  const visible: LiftType[] = [];

  for (const liftType of LIFT_TABS) {
    const records = tabRows[liftType].all;
    for (const rec of records) {
      if (isRecordInDateRange(rec.date, from, to)) {
        visible.push(liftType);
        break;
      }
    }
  }

  return visible;
}
