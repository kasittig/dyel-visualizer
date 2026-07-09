import type { AthleteContext, RawInput, TaggedSetRecord } from '@dyel/pipeline';
import { runPipelineModel } from '@dyel/pipeline';

export type LiftType = 'squat' | 'bench' | 'deadlift' | 'accessory';

export interface SplitRows {
  all: TaggedSetRecord[];
  maxEffort: TaggedSetRecord[];
  volume: TaggedSetRecord[];
}

const LIFT_TAG_MAP: Record<string, LiftType> = {
  'lift:squat': 'squat',
  'lift:bench': 'bench',
  'lift:deadlift': 'deadlift',
};

export function liftTypeOf(record: TaggedSetRecord): LiftType {
  for (const tag of record.tags) {
    const mapped = LIFT_TAG_MAP[tag];
    if (mapped) {
      return mapped;
    }
  }
  return 'accessory';
}

export function splitByEffort(records: TaggedSetRecord[], type: LiftType): SplitRows {
  if (type === 'accessory') {
    return { all: records, maxEffort: records, volume: [] };
  }

  const maxEffort: TaggedSetRecord[] = [];
  const volume: TaggedSetRecord[] = [];

  for (const record of records) {
    if (record.sets === 1 || record.rpe !== undefined) {
      maxEffort.push(record);
    } else {
      volume.push(record);
    }
  }

  return { all: records, maxEffort, volume };
}

export function groupByLiftType(tagged: TaggedSetRecord[]): Record<LiftType, SplitRows> {
  const byLiftType = Map.groupBy(tagged, liftTypeOf);

  return {
    squat: splitByEffort(byLiftType.get('squat') ?? [], 'squat'),
    bench: splitByEffort(byLiftType.get('bench') ?? [], 'bench'),
    deadlift: splitByEffort(byLiftType.get('deadlift') ?? [], 'deadlift'),
    accessory: splitByEffort(byLiftType.get('accessory') ?? [], 'accessory'),
  };
}

export function parseSheetData(csv: string, athlete: AthleteContext): Record<LiftType, SplitRows> {
  const raw: RawInput = { name: 'sheet.csv', content: csv };
  const model = runPipelineModel([raw], athlete);
  return groupByLiftType(model.tagged);
}
