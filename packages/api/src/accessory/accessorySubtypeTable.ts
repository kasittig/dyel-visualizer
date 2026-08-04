import { matches, type TaggedSetRecord } from '@dyel/pipeline';
import { buildMostRecentSessionDetail, type LastSessionDetail } from '../session/lastSessionDetail';
import { isRecordInDateRange } from '../dateRange/dateRangeUtils';

export type AccessorySubtype = 'upper' | 'lower' | 'core' | null;
export interface AccessoryTableRow {
  label: string;
  subtype: AccessorySubtype;
  effects: string[];
  lastSession: LastSessionDetail;
  sessionCount: number;
  sessionCountInRange: number;
}

const SUBTYPES: Exclude<AccessorySubtype, null>[] = ['core', 'upper', 'lower'];

export function buildAccessoryTableRows(
  tagged: TaggedSetRecord[],
  from?: Date,
  to?: Date
): AccessoryTableRow[] {
  const filtered = tagged.filter((r) => matches(r.tags, { all: ['lift:accessory'] }));

  return Array.from(
    Map.groupBy(filtered, (r) =>
      r.canonical ? `canonical:${r.canonical}` : `raw:${r.meta?.rawExercise ?? r.exercise}`
    )
  )
    .reduce<AccessoryTableRow[]>((acc, [, records]) => {
      const lastSession = buildMostRecentSessionDetail(records);
      if (!lastSession) {
        return acc;
      }

      const latestDate = Math.max(...records.map((r) => r.date));
      const latestTags = records.find((r) => r.date === latestDate)?.tags;
      const subtype = SUBTYPES.find((s) => latestTags?.has(`accessory:${s}`)) ?? null;

      const latestLabels = new Set<string>();
      const effects = new Set<string>();
      const sessionDates = new Set<number>();
      const inRangeSessionDates = new Set<number>();
      for (const r of records) {
        if (r.date === latestDate) {
          latestLabels.add(r.meta?.rawExercise ?? r.canonical);
        }
        for (const effect of r.effects) {
          effects.add(effect);
        }
        sessionDates.add(r.date);
        if (isRecordInDateRange(r.date, from, to)) {
          inRangeSessionDates.add(r.date);
        }
      }

      acc.push({
        label: [...latestLabels].sort((a, b) => a.localeCompare(b))[0]!,
        subtype,
        effects: [...effects],
        lastSession,
        sessionCount: sessionDates.size,
        sessionCountInRange: inRangeSessionDates.size,
      });
      return acc;
    }, [])
    .sort((a, b) => a.label.localeCompare(b.label));
}
