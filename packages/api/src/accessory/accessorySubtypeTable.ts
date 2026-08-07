import { groupBy, matches, type TaggedSetRecord } from '@dyel/pipeline';
import { buildMostRecentSessionDetail, type LastSessionDetail } from '../session/lastSessionDetail';
import { isRecordInDateRange } from '../dateRange/dateRangeUtils';
import { buildAccessoryProgress, type AccessoryProgress } from './accessoryProgress';
import {
  classifyAccessory,
  type AccessoryCategory,
  type AccessoryCategoryMappings,
  type AccessoryClassification,
} from './accessoryCoverage';

export type AccessorySubtype = 'upper' | 'lower' | 'core' | null;
export interface AccessoryTableRow {
  id: string;
  label: string;
  subtype: AccessorySubtype;
  category: AccessoryCategory | null;
  classification: AccessoryClassification;
  effects: string[];
  lastSession: LastSessionDetail;
  sessionCount: number;
  sessionCountInRange: number;
  progress: AccessoryProgress;
}

const SUBTYPES: Exclude<AccessorySubtype, null>[] = ['core', 'upper', 'lower'];

export function accessoryExerciseId(record: TaggedSetRecord): string {
  return record.canonical
    ? `canonical:${record.canonical}`
    : `raw:${record.meta?.rawExercise ?? record.exercise}`;
}

export function buildAccessoryTableRows(
  tagged: TaggedSetRecord[],
  from?: Date,
  to?: Date,
  mappings: AccessoryCategoryMappings = {}
): AccessoryTableRow[] {
  const filtered = tagged.filter((r) => matches(r.tags, { all: ['lift:accessory'] }));

  return Array.from(groupBy(filtered, accessoryExerciseId))
    .reduce<AccessoryTableRow[]>((acc, [id, records]) => {
      const lastSession = buildMostRecentSessionDetail(records);
      if (!lastSession) {
        return acc;
      }

      const latestDate = Math.max(...records.map((r) => r.date));
      const latestTags = records.find((r) => r.date === latestDate)?.tags;
      const subtype = SUBTYPES.find((s) => latestTags?.has(`accessory:${s}`)) ?? null;
      const classification = classifyAccessory(
        records.find((r) => r.date === latestDate)!,
        mappings
      );

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
        id,
        label: [...latestLabels].sort((a, b) => a.localeCompare(b))[0]!,
        subtype,
        category: classification.category,
        classification,
        effects: [...effects],
        lastSession,
        sessionCount: sessionDates.size,
        sessionCountInRange: inRangeSessionDates.size,
        progress: buildAccessoryProgress(records)!,
      });
      return acc;
    }, [])
    .sort((a, b) => a.label.localeCompare(b.label));
}
