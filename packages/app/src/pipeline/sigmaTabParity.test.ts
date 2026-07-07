/**
 * Parity test for SigmaTab: intentional exception to the pipeline migration boundary rule.
 * Like totalChartParity.test.ts, this imports directly from both @dyel/core (legacy implementation)
 * and @dyel/pipeline (new implementation) to run both over the same fixture and verify behavioral
 * equivalence after the volume merge. This is a test-file-only exception; the actual SigmaTab
 * component itself calls only runPipeline and never @dyel/core (see packages/app/CLAUDE.md).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import type { NormalizationModel } from '@dyel/pipeline';
import type { ChartPoint } from '@dyel/core';
import {
  parseConjugateData,
  buildSessionStats,
  calculateVolumeCorrelation,
  buildChartData,
} from '@dyel/core';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import {
  mergeRechartsRowsToChartPoints,
  mergeVolumeIntoChartPoints,
} from '../utils/pipelineChartUtils';
import { compareChartSeries } from '../testUtils/compareChartSeries';
import {
  joinChartPointsByDate,
  diffSeries,
  compareBaselineIdentity,
} from '../testUtils/diffChartSeries';
import { extractPairs, buildTabRows, computeEffectiveNames } from '../utils/appDataUtils';
import { computeBaselineTargetExercises } from '../hooks/data/useBaselineTargetExercises';
import { initialTabState } from '../utils/appUtils';
import { TOTAL_CHART_SPECS } from './totalChartSpecs';

const TOTAL_CHART_IDS = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];
const HARD_ASSERT_SERIES = ['squat', 'deadlift', 'pushPull', 'total'];

describe('SigmaTab core-vs-pipeline parity (with volume merge)', () => {
  let fixtureContent: string;
  let pipelineOutput: ChartPoint[];
  let legacyOutput: ChartPoint[];
  let joined: ReturnType<typeof joinChartPointsByDate>;
  let pipelineModel: NormalizationModel;
  let baselineExByType: ReturnType<typeof computeBaselineTargetExercises>['baselineExByType'];
  let deadliftStance: 'sumo' | 'conventional';
  let volumeByDate: Map<string, number>;

  beforeAll(() => {
    const fixturePath = join(__dirname, '../../test/fixtures/total-chart-sheet.csv');
    fixtureContent = readFileSync(fixturePath, 'utf-8');

    // Compute volumeByDate from legacy path (same calculation used for both sides)
    const pairs = parseConjugateData(fixtureContent);
    volumeByDate = calculateVolumeCorrelation(pairs);

    // Pipeline path: runPipeline + merge lift series + merge volume
    const raw = buildRawInput('url', fixtureContent);
    const result = runPipeline([raw], TOTAL_CHART_SPECS, PLACEHOLDER_ATHLETE, {});
    pipelineOutput = mergeRechartsRowsToChartPoints(result.datasets, TOTAL_CHART_IDS, 'lbs');
    pipelineOutput = mergeVolumeIntoChartPoints(pipelineOutput, volumeByDate);
    pipelineModel = result.model;

    // Legacy @dyel/core path using same fixture content
    const state = { status: 'success' as const, pairs };
    const dataMap = extractPairs(state);
    const tabRows = buildTabRows(dataMap);
    const tabState = initialTabState();
    deadliftStance = 'sumo'; // Default documented in HANDOFF.md
    const { effectiveBaselineNames, effectiveTargetNames } = computeEffectiveNames(
      tabRows,
      tabState,
      deadliftStance
    );
    const computed = computeBaselineTargetExercises(
      pairs,
      effectiveBaselineNames,
      effectiveTargetNames
    );
    baselineExByType = computed.baselineExByType;
    const { targetExByType } = computed;
    const stats = buildSessionStats(pairs, effectiveBaselineNames, new Date());
    legacyOutput = buildChartData(pairs, baselineExByType, targetExByType, stats, volumeByDate);

    joined = joinChartPointsByDate(legacyOutput, pipelineOutput);
  });

  it('produces non-empty chart data from fixture', () => {
    expect(pipelineOutput.length).toBeGreaterThan(0);
  });

  it('produces chart points with expected structure', () => {
    expect(pipelineOutput[0]).toBeDefined();
    const firstPoint = pipelineOutput[0];
    expect(firstPoint).toHaveProperty('date');
    expect(typeof firstPoint.date).toBe('string');
    const hasAnyLift = TOTAL_CHART_IDS.some((lift) => lift in firstPoint);
    expect(hasAnyLift).toBe(true);
  });

  it.each(['squat', 'bench', 'deadlift'])(
    'baseline identity: %s legacy vs pipeline agreement',
    (family) => {
      const legacyEx = baselineExByType.get(family);
      const pipelineCanonical = pipelineModel.baseline[`lift:${family}`];

      const comparison = compareBaselineIdentity(
        family,
        legacyEx,
        pipelineCanonical,
        deadliftStance
      );

      // Hard assert for all three families: squat/deadlift already matched; bench now
      // matches too after adding the paused/"commands" bench preference tier to
      // fitNormalizationModel (packages/pipeline/src/derive/normalize.ts), mirroring
      // legacy's defaultCompExerciseName commandsBench preference.
      expect(comparison.matches).toBe(true);
    }
  );

  it.each(HARD_ASSERT_SERIES)('hard asserts: %s values are consistent and reasonable', (series) => {
    const { count, values, range, ratio } = compareChartSeries(pipelineOutput, series);
    expect(count).toBeGreaterThan(0);
    values.forEach((v) => {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(10000);
    });
    expect(range).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(3);
  });

  // Legacy (@dyel/core) and pipeline (@dyel/pipeline) independently reimplement e1RM variant-factor
  // normalization with materially different fitting behavior. See totalChartParity.test.ts for
  // the full explanation of this divergence (speed-work filtering, minimum-sample gating, canonical
  // grouping granularity, and the tracked issue #451 for chain/band modifier collapsing). This test
  // documents the same real per-series divergence.
  it.each(['squat', 'deadlift', 'pushPull', 'total'])(
    'core-vs-pipeline soft-warn: %s divergence from legacy normalization (tracked, not yet reconciled)',
    (series) => {
      const diff = diffSeries(joined, series);

      // Hard assertion: joined data must have overlapping dates (catches date-parsing regressions)
      expect(diff.comparedCount).toBeGreaterThan(0);

      // Soft warn: log real diagnostic numbers for visibility, not for gating
      console.warn(
        `core-vs-pipeline ${series}: compared=${diff.comparedCount} missingInA=${diff.missingInA} missingInB=${diff.missingInB} maxAbsDiff=${diff.maxAbsDiff} maxRelDiff=${(diff.maxRelDiff * 100).toFixed(1)}%`
      );
    }
  );

  it('soft warn: bench values exist and are reasonable (known divergence from core)', () => {
    const { count, values, ratio } = compareChartSeries(pipelineOutput, 'bench');

    if (count === 0) {
      console.warn('No bench data points found in pipeline output');
      return;
    }

    values.forEach((v) => {
      if (typeof v !== 'number' || v <= 0) {
        console.warn(`Unexpected bench value: ${v}`);
      }
      if (v > 10000) {
        console.warn(`Unreasonable bench value: ${v} lbs`);
      }
    });

    if (values.length > 1 && ratio > 3) {
      console.warn(`Large bench variation detected: ratio ${ratio.toFixed(2)}x`);
    }

    expect(count).toBeGreaterThan(0);
  });

  it('volume series: legacy and pipeline sources match exactly (same calculateVolumeCorrelation)', () => {
    const diff = diffSeries(joined, 'volume');

    // Both paths source volume from the exact same calculateVolumeCorrelation(pairs) call,
    // so they should match exactly (or within floating-point rounding noise).
    expect(diff.comparedCount).toBeGreaterThan(0);
    expect(diff.maxAbsDiff).toBe(0);
    expect(diff.missingInA).toBe(0);
    expect(diff.missingInB).toBe(0);
  });

  it('dates are in chronological order', () => {
    const dates = pipelineOutput.map((p) => new Date(p.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });

  it('all date strings are valid ISO format', () => {
    pipelineOutput.forEach((p) => {
      const dateObj = new Date(p.date);
      expect(dateObj.getTime()).not.toBeNaN();
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
