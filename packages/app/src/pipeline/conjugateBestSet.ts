import type { TaggedSetRecord } from '@dyel/pipeline';
import { matches, isSpeedWork, calcE1RM } from '@dyel/pipeline';

export interface BestSet {
  sets: number;
  reps: number;
  weight: number; // kg -- pipeline convention; caller converts to display unit
  rpe: number | null;
}

/**
 * Builds a per-(variation label, date) "best set" lookup from tagged records, mirroring
 * legacy's buildVariationChartData `bestSetByLabelAndDate` (the highest-e1RM set logged
 * that day for that variation, used to enrich chart tooltips with sets/reps/weight/RPE).
 *
 * A day's speed-work-only sets (see `isSpeedWork`) are excluded entirely before picking the
 * best set -- mirroring the `e1rm-max-effort` deriver's exclusion of speed-work-only days
 * (which is what the ConjugateCharts `variations`/`normalized` datasets are derived from),
 * so a tooltip never surfaces a best-set detail for a date the chart itself has no point for.
 *
 * Keyed by `new Date(record.date).toISOString()` to match the date string produced by
 * `mergeWideRechartsRows` (`utils/pipelineChartUtils.ts`) for the same underlying timestamp.
 */
export function buildBestSetByLabelAndDate(
  tagged: TaggedSetRecord[],
  liftType: string
): Map<string, Map<string, BestSet>> {
  const filtered = tagged.filter((r) => matches(r.tags, { all: [`lift:${liftType}`] }));

  const byLabelAndDate = Map.groupBy(filtered, (r) => {
    const label = r.meta?.rawExercise ?? r.canonical;
    return `${label}::${new Date(r.date).toISOString()}`;
  });

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
