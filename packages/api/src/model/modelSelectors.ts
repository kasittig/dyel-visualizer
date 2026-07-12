import type { LiftType, TaggedSetRecord } from '@dyel/pipeline';
import type { SplitRows } from '../sheet/parseSheetData';
import { isRecordInDateRange } from '../dateRange/dateRangeUtils';
import { defaultCompExerciseCanonical } from '../sheet/defaultExercise';

const LIFT_TABS: LiftType[] = ['squat', 'bench', 'deadlift', 'accessory'];

export function detectDataUnit(tabRows: Record<LiftType, SplitRows>): 'lbs' | 'kg' {
  for (const lift of LIFT_TABS) {
    for (const rec of tabRows[lift].all) {
      if (rec.meta?.rawUnit) {
        return rec.meta.rawUnit === 'lbs' ? 'lbs' : 'kg';
      }
    }
  }
  return 'lbs';
}

export function collectSessionDates(tabRows: Record<LiftType, SplitRows>): {
  allSessionDates: Date[];
  lastSessionDate: Date | null;
} {
  const allRecords = LIFT_TABS.flatMap((lift) => [
    ...tabRows[lift].maxEffort,
    ...tabRows[lift].volume,
  ]);
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

export function collectVolumeRecords(tabRows: Record<LiftType, SplitRows>): TaggedSetRecord[] {
  return LIFT_TABS.flatMap((lift) => tabRows[lift].volume);
}

export function defaultCanonicalsByLift(
  tabRows: Record<LiftType, SplitRows>,
  deadliftStance: string
): Partial<Record<LiftType, string>> {
  const result: Partial<Record<LiftType, string>> = {};
  for (const lift of LIFT_TABS) {
    const canonical = defaultCompExerciseCanonical(tabRows[lift].all, deadliftStance);
    if (canonical) {
      result[lift] = canonical;
    }
  }
  return result;
}

export function visibleLiftTypes(
  tabRows: Record<LiftType, SplitRows>,
  from: Date | undefined,
  to: Date | undefined
): LiftType[] {
  return LIFT_TABS.filter((lift) =>
    tabRows[lift].all.some((rec) => isRecordInDateRange(rec.date, from, to))
  );
}
