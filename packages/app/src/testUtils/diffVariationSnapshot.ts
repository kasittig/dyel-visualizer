import type { RechartsRow } from '@dyel/pipeline';
import type { ConjugateExercise, SessionStats } from '@dyel/core';
import { normalizeToBaseE1RM } from '@dyel/core';

const KG_TO_LBS = 2.20462262185;
const getConverter = (unit: 'lbs' | 'kg') =>
  unit === 'lbs' ? (v: number) => Math.round(v * KG_TO_LBS) : (v: number) => v;

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

export function snapshotVariationsFromPipeline(
  variationRows: RechartsRow[],
  unit: 'lbs' | 'kg' = 'lbs'
): VariationSnapshot {
  if (!variationRows.length) {
    return {};
  }
  const conv = getConverter(unit);
  const lastRow = variationRows.reduce((a, b) => ((b.t as number) > (a.t as number) ? b : a));

  return Object.fromEntries(
    Object.entries(lastRow)
      .filter(([k, v]) => k !== 't' && typeof v === 'number')
      .map(([k, v]) => [k, Math.round(conv(v as number))])
  );
}

export function snapshotVariationsFromLegacy(
  variationNames: string[],
  exerciseByName: Map<string, ConjugateExercise>,
  stats: SessionStats,
  targetName: string,
  baselineName: string | undefined,
  unit: 'lbs' | 'kg' = 'lbs'
): VariationSnapshot {
  const conv = getConverter(unit);
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
    snapshot[name] = normalized !== null ? Math.round(conv(normalized)) : undefined;
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
