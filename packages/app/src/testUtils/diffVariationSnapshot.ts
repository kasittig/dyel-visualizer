import type { RechartsRow } from '@dyel/pipeline';
import type { ConjugateExercise, SessionStats } from '@dyel/core';
import { normalizeToBaseE1RM } from '@dyel/core';

/**
 * A snapshot of e1rm values by variation name, typically representing the last session's
 * normalized or raw e1rm for each variation in a lift type.
 */
export interface VariationSnapshot {
  [variationName: string]: number | undefined;
}

/**
 * Diff result comparing a legacy snapshot to a pipeline snapshot.
 */
export interface VariationSnapshotDiff {
  variationName: string;
  legacyValue: number | undefined;
  pipelineValue: number | undefined;
  absDiff: number;
  relDiff: number; // relative difference as a decimal (0-1 range typically)
}

/**
 * Reduces a pipeline's per-variation time series (from conjugateChartSpecs) to a
 * last-value-per-variation snapshot. Extracts the last (highest timestamp) row and
 * collects all variation names and their e1rm values.
 *
 * @param variationRows - RechartsRow array with 't' timestamp and variation name keys
 * @param unit - conversion unit ('lbs' | 'kg')
 * @returns snapshot object { variationName: e1rmValue, ... } converted to target unit
 */
export function snapshotVariationsFromPipeline(
  variationRows: RechartsRow[],
  unit: 'lbs' | 'kg' = 'lbs'
): VariationSnapshot {
  if (variationRows.length === 0) {
    return {};
  }

  // Pipeline output is always in kg; convert to target unit if needed
  const KG_TO_LBS = 2.20462262185;
  const converter = unit === 'lbs' ? (v: number) => Math.round(v * KG_TO_LBS) : (v: number) => v;

  // Get the last row by timestamp
  const lastRow = variationRows.reduce((prev, curr) =>
    (curr.t as number) > (prev.t as number) ? curr : prev
  );

  const snapshot: VariationSnapshot = {};
  for (const [key, value] of Object.entries(lastRow)) {
    // Skip the timestamp key 't'
    if (key !== 't' && typeof value === 'number') {
      snapshot[key] = Math.round(converter(value));
    }
  }

  return snapshot;
}

/**
 * Builds a legacy snapshot using VariationRadarChart's normalizeToBaseE1RM logic for
 * each variation. Mirrors the per-variation normalization in VariationRadarChart.tsx.
 *
 * @param variationNames - array of variation exercise display names
 * @param exerciseByName - map from display name to ConjugateExercise
 * @param stats - SessionStats with lastSession data
 * @param targetName - target lift display name for normalization
 * @param baselineName - optional baseline lift display name
 * @param unit - conversion unit ('lbs' | 'kg')
 * @returns snapshot object { variationName: normalizedE1rm, ... }
 */
export function snapshotVariationsFromLegacy(
  variationNames: string[],
  exerciseByName: Map<string, ConjugateExercise>,
  stats: SessionStats,
  targetName: string,
  baselineName: string | undefined,
  unit: 'lbs' | 'kg' = 'lbs'
): VariationSnapshot {
  const KG_TO_LBS = 2.20462262185;
  const converter = unit === 'lbs' ? (v: number) => Math.round(v * KG_TO_LBS) : (v: number) => v;

  const targetEx = exerciseByName.get(targetName);
  const baselineEx = baselineName ? exerciseByName.get(baselineName) : undefined;

  const snapshot: VariationSnapshot = {};

  for (const name of variationNames) {
    const sourceEx = exerciseByName.get(name);
    const lastSess = stats.lastSession.get(name);

    if (!sourceEx || !lastSess || !targetEx) {
      snapshot[name] = undefined;
    } else {
      const normalized = normalizeToBaseE1RM(lastSess, sourceEx, targetEx, stats, baselineEx);
      snapshot[name] = normalized !== null ? Math.round(converter(normalized)) : undefined;
    }
  }

  return snapshot;
}

/**
 * Diffs a legacy snapshot against a pipeline snapshot, computing absolute and relative
 * differences for each variation. Used for core-vs-pipeline parity testing of variation normalization.
 *
 * @param legacySnapshot - snapshot from snapshotVariationsFromLegacy
 * @param pipelineSnapshot - snapshot from snapshotVariationsFromPipeline
 * @returns array of VariationSnapshotDiff results, one per variation found in either snapshot
 */
export function diffVariationSnapshots(
  legacySnapshot: VariationSnapshot,
  pipelineSnapshot: VariationSnapshot
): VariationSnapshotDiff[] {
  const allVariations = new Set([...Object.keys(legacySnapshot), ...Object.keys(pipelineSnapshot)]);

  const diffs: VariationSnapshotDiff[] = [];

  for (const variationName of allVariations) {
    const legacyValue = legacySnapshot[variationName];
    const pipelineValue = pipelineSnapshot[variationName];

    let absDiff = 0;
    let relDiff = 0;

    if (typeof legacyValue === 'number' && typeof pipelineValue === 'number') {
      absDiff = Math.abs(legacyValue - pipelineValue);
      const denom = Math.max(Math.abs(legacyValue), Math.abs(pipelineValue));
      relDiff = denom === 0 ? 0 : absDiff / denom;
    }

    diffs.push({
      variationName,
      legacyValue,
      pipelineValue,
      absDiff,
      relDiff,
    });
  }

  return diffs.sort((a, b) => a.variationName.localeCompare(b.variationName));
}
