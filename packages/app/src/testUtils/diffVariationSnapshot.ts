import type { RechartsRow } from '@dyel/pipeline';
import type { ConjugateExercise, SessionStats } from '@dyel/core';
import { normalizeToBaseE1RM } from '@dyel/core';
import { snapshotVariationsFromPipeline as snapshotFromPipeline } from '../utils/variationSnapshot';

export interface VariationSnapshot {
  [name: string]: number | undefined;
}

export interface VariationSnapshotDiff {
  variationName: string;
  legacyValue: number | undefined;
  pipelineValue: number | undefined;
  absDiff: number;
  relDiff: number;
}

/**
 * Delegates to the runtime util in utils/variationSnapshot.ts to avoid duplication.
 * Test-only re-export for backwards compatibility.
 */
export function snapshotVariationsFromPipeline(
  variationRows: RechartsRow[],
  unit: 'lbs' | 'kg' = 'lbs'
): VariationSnapshot {
  return snapshotFromPipeline(variationRows, unit);
}

// NOTE: unlike @dyel/pipeline's SetRecord.weight (always kg-canonical, see packages/pipeline/CLAUDE.md),
// @dyel/core's TrainingSession.weight is stored in whatever unit the source sheet declared
// (see packages/core/src/transform/CLAUDE.md's detectWeightUnit / "no value conversion" invariant) —
// there is no unit-normalization step in @dyel/core. normalizeToBaseE1RM's output is therefore
// already in that same native unit, so it must NOT be run through a kg->lbs converter here (that
// was a real bug: it silently double-converted already-lbs values by ~2.2x for lbs-denominated
// fixtures). This mirrors buildVariationChartData's own (correct) precedent, which returns
// Math.round(normalized) with no unit conversion at all.
export function snapshotVariationsFromLegacy(
  variationNames: string[],
  exerciseByName: Map<string, ConjugateExercise>,
  stats: SessionStats,
  targetName: string,
  baselineName: string | undefined
): VariationSnapshot {
  const targetEx = exerciseByName.get(targetName);
  const baselineEx = baselineName ? exerciseByName.get(baselineName) : undefined;
  const snapshot: VariationSnapshot = {};

  for (const name of variationNames) {
    const sourceEx = exerciseByName.get(name);
    const lastSess = stats.lastSession.get(name);
    const normalized =
      !sourceEx || !lastSess || !targetEx
        ? null
        : normalizeToBaseE1RM(lastSess, sourceEx, targetEx, stats, baselineEx);
    snapshot[name] = normalized !== null ? Math.round(normalized) : undefined;
  }
  return snapshot;
}

export function diffVariationSnapshots(
  legacy: VariationSnapshot,
  pipeline: VariationSnapshot
): VariationSnapshotDiff[] {
  const allVariations = Array.from(new Set([...Object.keys(legacy), ...Object.keys(pipeline)]));

  return allVariations
    .map((variationName) => {
      const legacyValue = legacy[variationName];
      const pipelineValue = pipeline[variationName];
      const hasValues = typeof legacyValue === 'number' && typeof pipelineValue === 'number';

      const absDiff = hasValues ? Math.abs(legacyValue - pipelineValue) : 0;
      const denom = hasValues ? Math.max(Math.abs(legacyValue), Math.abs(pipelineValue)) : 0;
      const relDiff = denom === 0 ? 0 : absDiff / denom;

      return { variationName, legacyValue, pipelineValue, absDiff, relDiff };
    })
    .sort((a, b) => a.variationName.localeCompare(b.variationName));
}
