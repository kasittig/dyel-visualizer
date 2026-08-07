import type { TaggedSetRecord } from '@dyel/pipeline';
import { matches, isSpeedWork, calcE1RM, groupBy } from '@dyel/pipeline';

export interface BestSet {
  sets: number;
  reps: number;
  weight: number;
  rpe: number | null;
}

export function buildBestSetByLabelAndDate(
  tagged: TaggedSetRecord[],
  liftType: string
): Map<string, Map<string, BestSet>> {
  const filtered = tagged.filter((r) => matches(r.tags, { all: [`lift:${liftType}`] }));
  const byLabelAndDate = groupBy(
    filtered,
    (r) => `${r.meta?.rawExercise ?? r.canonical}::${new Date(r.date).toISOString()}`
  );
  const result = new Map<string, Map<string, BestSet>>();

  for (const [key, records] of byLabelAndDate) {
    const sepIdx = key.lastIndexOf('::');
    const label = key.slice(0, sepIdx);
    const date = key.slice(sepIdx + 2);
    const effortSets = liftType === 'accessory' ? records : records.filter((r) => !isSpeedWork(r));
    if (!effortSets.length) {
      continue;
    }

    const withE1RM = effortSets.map((r) => ({ r, e1rm: calcE1RM(r.weight, r.reps, r.rpe) }));
    const best = withE1RM.reduce((a, b) => (b.e1rm > a.e1rm ? b : a)).r;

    if (!result.has(label)) {
      result.set(label, new Map());
    }
    result.get(label)!.set(date, {
      sets: best.meta?.sets ? parseInt(best.meta.sets, 10) : effortSets.length,
      reps: best.reps,
      weight: best.weight,
      rpe: best.rpe ?? null,
    });
  }

  return result;
}
