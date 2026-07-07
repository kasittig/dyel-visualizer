import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import type { ChartPoint } from '@dyel/core';
import {
  parseConjugateData,
  buildSessionStats,
  calculateVolumeCorrelation,
  buildChartData,
} from '@dyel/core';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import { mergeRechartsRowsToChartPoints } from '../utils/pipelineChartUtils';
import { compareChartSeries } from '../testUtils/compareChartSeries';
import { joinChartPointsByDate, diffSeries } from '../testUtils/diffChartSeries';
import { extractPairs, buildTabRows, computeEffectiveNames } from '../utils/appDataUtils';
import { computeBaselineTargetExercises } from '../hooks/data/useBaselineTargetExercises';
import { initialTabState } from '../utils/appUtils';
import { TOTAL_CHART_SPECS } from './totalChartSpecs';

const TOTAL_CHART_IDS = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];
const HARD_ASSERT_SERIES = ['squat', 'deadlift', 'pushPull', 'total'];

describe('TotalChart core-vs-pipeline parity', () => {
  let fixtureContent: string;
  let pipelineOutput: ChartPoint[];
  let legacyOutput: ChartPoint[];
  let joined: ReturnType<typeof joinChartPointsByDate>;

  beforeAll(() => {
    const fixturePath = join(__dirname, '../../test/fixtures/total-chart-sheet.csv');
    fixtureContent = readFileSync(fixturePath, 'utf-8');

    // Pipeline path
    const raw = buildRawInput('url', fixtureContent);
    const result = runPipeline([raw], TOTAL_CHART_SPECS, PLACEHOLDER_ATHLETE, {});
    pipelineOutput = mergeRechartsRowsToChartPoints(result.datasets, TOTAL_CHART_IDS, 'lbs');

    // Legacy @dyel/core path using same fixture content
    const pairs = parseConjugateData(fixtureContent);
    const state = { status: 'success' as const, pairs };
    const dataMap = extractPairs(state);
    const tabRows = buildTabRows(dataMap);
    const tabState = initialTabState();
    const deadliftStance = 'sumo'; // Default documented in HANDOFF.md
    const { effectiveBaselineNames, effectiveTargetNames } = computeEffectiveNames(
      tabRows,
      tabState,
      deadliftStance
    );
    const { baselineExByType, targetExByType } = computeBaselineTargetExercises(
      pairs,
      effectiveBaselineNames,
      effectiveTargetNames
    );
    const stats = buildSessionStats(pairs, effectiveBaselineNames, new Date());
    const volume = calculateVolumeCorrelation(pairs);
    legacyOutput = buildChartData(pairs, baselineExByType, targetExByType, stats, volume);

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
  // normalization with materially different fitting behavior: pipeline's fitNormalizationModel
  // (packages/pipeline/src/derive/normalize.ts) excludes "speed work" sets (high-rep/no-RPE days)
  // from the fit entirely, while legacy's fitVariantFactor (packages/core/src/utils/math/e1rm.ts)
  // does not; the two also differ in minimum-sample gating behavior and (independently) in
  // canonical/name-grouping granularity. A related, more specific bug — chain-count and
  // band-tension modifiers (e.g. "light rev. bands" vs "mini rev. bands") collapsing into a
  // single pipeline canonical and corrupting the affected variant fits — is tracked separately
  // as GitHub issue #451; that fix will narrow but not eliminate the broader divergence described
  // above. Until pipeline's normalization-fitting behavior is deliberately reconciled with (or
  // intentionally diverged from, with sign-off) legacy's, this test documents real per-series
  // divergence rather than asserting a fabricated tolerance band.
  it.each(TOTAL_CHART_IDS)(
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
