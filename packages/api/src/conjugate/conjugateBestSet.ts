import type { TaggedSetRecord } from '@dyel/pipeline';
import { matches, isSpeedWork, calcE1RM } from '@dyel/pipeline';

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
  const byLabelAndDate = Map.groupBy(
    filtered,
    (r) => `${r.meta?.rawExercise ?? r.canonical}::${new Date(r.date).toISOString()}`
  );
  const result = new Map<string, Map<string, BestSet>>();

  for (const [key, records] of byLabelAndDate) {
    const [label, date] = key.split('::');
    const effortSets = records.filter((r) => !isSpeedWork(r));
    if (!effortSets.length) {
      continue;
    }

    const best = effortSets.reduce((a, b) =>
      calcE1RM(b.weight, b.reps, b.rpe) > calcE1RM(a.weight, a.reps, a.rpe) ? b : a
    );

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
