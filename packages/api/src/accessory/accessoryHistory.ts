import type { ChartPoint, TaggedSetRecord } from '@dyel/pipeline';
import { isRecordInDateRange } from '../dateRange/dateRangeUtils';
import { convertWeight, type DisplayUnit } from '../weightUnit';
import { accessoryExerciseId } from './accessorySubtypeTable';

export type AccessoryHistoryMetric = 'load' | 'volume' | 'reps';

export interface AccessoryHistoryData {
  metric: AccessoryHistoryMetric;
  metricLabel: string;
  unitLabel: string;
  data: ChartPoint[];
}

function recordSets(record: TaggedSetRecord): number {
  const sets = record.meta?.sets ? Number.parseInt(record.meta.sets, 10) : (record.sets ?? 1);
  return Number.isFinite(sets) && sets > 0 ? sets : 1;
}

/** Selects a conservative metric that remains comparable across the exercise's full history. */
export function selectAccessoryHistoryMetric(records: TaggedSetRecord[]): AccessoryHistoryMetric {
  if (!records.length || records.some((record) => record.weight <= 0)) {
    return 'reps';
  }

  const schemes = new Set(records.map((record) => `${recordSets(record)}:${record.reps}`));
  return schemes.size === 1 ? 'load' : 'volume';
}

export function buildAccessoryHistory(
  tagged: TaggedSetRecord[],
  exerciseId: string,
  unit: DisplayUnit,
  from?: Date,
  to?: Date
): AccessoryHistoryData | null {
  const allRecords = tagged.filter(
    (record) => record.tags.has('lift:accessory') && accessoryExerciseId(record) === exerciseId
  );
  if (!allRecords.length) {
    return null;
  }

  const metric = selectAccessoryHistoryMetric(allRecords);
  const data = Array.from(
    Map.groupBy(
      allRecords.filter((record) => isRecordInDateRange(record.date, from, to)),
      (record) => record.date
    ),
    ([date, records]) => {
      let value: number;
      if (metric === 'load') {
        value = convertWeight(Math.max(...records.map((record) => record.weight)), unit);
      } else if (metric === 'volume') {
        value = convertWeight(
          records.reduce(
            (total, record) => total + record.weight * record.reps * recordSets(record),
            0
          ),
          unit
        );
      } else {
        value = records.reduce((total, record) => total + record.reps * recordSets(record), 0);
      }
      return { date: new Date(date).toISOString(), value: Math.round(value) } as ChartPoint;
    }
  ).sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return {
    metric,
    metricLabel:
      metric === 'load' ? 'Best load' : metric === 'volume' ? 'Total volume' : 'Total reps',
    unitLabel: metric === 'load' ? unit : metric === 'volume' ? `${unit}-reps` : 'reps',
    data,
  };
}
