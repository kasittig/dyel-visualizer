import type { AthleteContext, LiftType, TaggedSetRecord } from '@dyel/pipeline';
import { runPipelineModel } from '@dyel/pipeline';
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
  const maxEffort = records.filter((r) => r.sets === 1 || r.rpe !== undefined);
  return { all: records, maxEffort, volume: records.filter((r) => !maxEffort.includes(r)) };
}

export function groupByLiftType(tagged: TaggedSetRecord[]): Record<LiftType, SplitRows> {
  const g = Map.groupBy(tagged, liftTypeOf);
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
