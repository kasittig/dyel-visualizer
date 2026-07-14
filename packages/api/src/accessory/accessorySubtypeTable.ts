import { matches, type TaggedSetRecord } from '@dyel/pipeline';
import { buildLastSessionDetail, type LastSessionDetail } from '../session/lastSessionDetail';
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
  const lastSessionByLabel = buildLastSessionDetail(tagged, 'accessory');
  const filtered = tagged.filter((r) => matches(r.tags, { all: ['lift:accessory'] }));

  return Array.from(Map.groupBy(filtered, (r) => r.meta?.rawExercise ?? r.canonical))
    .reduce<AccessoryTableRow[]>((acc, [label, records]) => {
      const lastSession = lastSessionByLabel.get(label);
      if (!lastSession) {
        return acc;
      }

      const latestDate = Math.max(...records.map((r) => r.date));
      const latestTags = records.find((r) => r.date === latestDate)?.tags;
      const subtype = SUBTYPES.find((s) => latestTags?.has(`accessory:${s}`)) ?? null;

      const sessionDates = new Set<number>();
      const inRangeSessionDates = new Set<number>();
      for (const r of records) {
        sessionDates.add(r.date);
        if (isRecordInDateRange(r.date, from, to)) {
          inRangeSessionDates.add(r.date);
        }
      }

      acc.push({
        label,
        subtype,
        effects: [...(records[0]?.effects ?? [])],
        lastSession,
        sessionCount: sessionDates.size,
        sessionCountInRange: inRangeSessionDates.size,
      });
      return acc;
    }, [])
    .sort((a, b) => a.label.localeCompare(b.label));
}
