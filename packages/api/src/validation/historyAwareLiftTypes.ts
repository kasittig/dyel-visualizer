import { tagRecordsByPrimaryEvidence, type SetRecord } from '@dyel/pipeline';

export interface LiftTypeCounts {
  squat: number;
  bench: number;
  deadlift: number;
  accessory: number;
}

export const emptyLiftTypeCounts = (): LiftTypeCounts => ({
  squat: 0,
  bench: 0,
  deadlift: 0,
  accessory: 0,
});

export function countHistoryAwareLiftTypes(records: SetRecord[]): LiftTypeCounts {
  const counts = emptyLiftTypeCounts();
  for (const record of tagRecordsByPrimaryEvidence(records).tagged) {
    const type = (['squat', 'bench', 'deadlift'] as const).find((candidate) =>
      record.tags.has(`lift:${candidate}`)
    );
    counts[type ?? 'accessory']++;
  }
  return counts;
}
