import type { AthleteContext, LiftType, TaggedSetRecord } from '@dyel/pipeline';
import { groupBy, runPipelineModel } from '@dyel/pipeline';
export type { LiftType } from '@dyel/pipeline';

export interface SplitRows {
  all: TaggedSetRecord[];
  maxEffort: TaggedSetRecord[];
  volume: TaggedSetRecord[];
}

const LIFT_MAP: Record<string, LiftType> = {
  'lift:squat': 'squat',
  'lift:bench': 'bench',
  'lift:deadlift': 'deadlift',
};

export function liftTypeOf(rec: TaggedSetRecord): LiftType {
  return [...rec.tags].map((t) => LIFT_MAP[t]).find(Boolean) ?? 'accessory';
}

export function splitByEffort(records: TaggedSetRecord[], type: LiftType): SplitRows {
  if (type === 'accessory') {
    return { all: records, maxEffort: records, volume: [] };
  }
  const maxEffort: TaggedSetRecord[] = [];
  const volume: TaggedSetRecord[] = [];
  for (const record of records) {
    (record.sets === 1 || record.rpe !== undefined ? maxEffort : volume).push(record);
  }
  return { all: records, maxEffort, volume };
}

export function groupByLiftType(tagged: TaggedSetRecord[]): Record<LiftType, SplitRows> {
  const g = groupBy(tagged, liftTypeOf);
  return {
    squat: splitByEffort(g.get('squat') ?? [], 'squat'),
    bench: splitByEffort(g.get('bench') ?? [], 'bench'),
    deadlift: splitByEffort(g.get('deadlift') ?? [], 'deadlift'),
    accessory: splitByEffort(g.get('accessory') ?? [], 'accessory'),
  };
}

export function parseSheetData(csv: string, athlete: AthleteContext): Record<LiftType, SplitRows> {
  return groupByLiftType(runPipelineModel([{ name: 'sheet.csv', content: csv }], athlete).tagged);
}
