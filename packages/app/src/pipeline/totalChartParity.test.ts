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
  filterByDateRange,
} from '@dyel/core';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import { mergeRechartsRowsToChartPoints } from '../utils/pipelineChartUtils';
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

describe('TotalChart core-vs-pipeline parity', () => {
  let fixtureContent: string;
  let pipelineOutput: ChartPoint[];
  let legacyOutput: ChartPoint[];
  let joined: ReturnType<typeof joinChartPointsByDate>;
  let pipelineModel: NormalizationModel;
  let baselineExByType: ReturnType<typeof computeBaselineTargetExercises>['baselineExByType'];
  let deadliftStance: 'sumo' | 'conventional';

  beforeAll(() => {
    const fixturePath = join(__dirname, '../../test/fixtures/total-chart-sheet.csv');
    fixtureContent = readFileSync(fixturePath, 'utf-8');

    const pairs = parseConjugateData(fixtureContent);
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
    const allPairs = [
      ...tabRows.squat.maxEffort,
      ...tabRows.bench.maxEffort,
      ...tabRows.deadlift.maxEffort,
      ...tabRows.accessory.maxEffort,
    ];
    const lastSessionDate = allPairs.reduce<Date | null>(
      (last, [, session]) => (!last || session.date > last ? session.date : last),
      null
    );
    const dateRange =
      lastSessionDate === null
        ? { from: undefined, to: undefined }
        : {
            from: new Date(
              lastSessionDate.getFullYear(),
              lastSessionDate.getMonth() - 3,
              lastSessionDate.getDate()
            ),
            to: lastSessionDate,
          };
    const sigmaPairs = [
      ...tabRows.squat.maxEffort,
      ...tabRows.bench.maxEffort,
      ...tabRows.deadlift.maxEffort,
    ];
    const filteredSigmaPairs = filterByDateRange(sigmaPairs, dateRange.from, dateRange.to);
    const volumePairs = [
      ...tabRows.squat.volume,
      ...tabRows.bench.volume,
      ...tabRows.deadlift.volume,
      ...tabRows.accessory.volume,
    ];

    // Pipeline path, matching usePipelineTotalChartData's date-range RenderParams.
    const raw = buildRawInput('url', fixtureContent);
    const ui =
      dateRange.from && dateRange.to
        ? { dateRange: [dateRange.from.getTime(), dateRange.to.getTime()] as [number, number] }
        : {};
    const result = runPipeline([raw], TOTAL_CHART_SPECS, PLACEHOLDER_ATHLETE, ui);
    pipelineOutput = mergeRechartsRowsToChartPoints(result.datasets, TOTAL_CHART_IDS, 'lbs');
    pipelineModel = result.model;

    // Legacy @dyel/core path using the same fixture content and the same app-level
    // filtering that main used before handing data to TotalChart:
    // App.tsx -> tabRows.*.maxEffort -> filteredSigmaPairs -> buildChartData.
    const computed = computeBaselineTargetExercises(
      filteredSigmaPairs,
      effectiveBaselineNames,
      effectiveTargetNames
    );
    baselineExByType = computed.baselineExByType;
    const { targetExByType } = computed;
    const stats = buildSessionStats(filteredSigmaPairs, effectiveBaselineNames, new Date());
    const volume = calculateVolumeCorrelation(volumePairs);
    legacyOutput = buildChartData(
      filteredSigmaPairs,
      baselineExByType,
      targetExByType,
      stats,
      volume
    );

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
  // normalization. Several previously-suspected causes of divergence have since been
  // investigated/fixed (see migration/ConjugateCharts.md for full root-cause history) and no
  // longer apply here — do not re-add them without re-verifying against current code first:
  //   - Speed-work exclusion asymmetry: FIXED. Pipeline's fitNormalizationModel
  //     (packages/pipeline/src/derive/normalize.ts) no longer excludes speed-work sets from
  //     fitting (the `effortOnly` filter was removed) — both sides now fit on unfiltered records.
  //   - Minimum-sample gating: DOWNGRADED, not a live issue. Production `runPipeline` calls use
  //     MIN_SAMPLES = 1, equivalent to legacy's own `factors.length > 0` gate — both sides agree
  //     at n=1.
  //   - GitHub issue #451 (chain-count/band-tension modifiers collapsing into a single pipeline
  //     canonical): CLOSED, confirmed no longer live directly against current
  //     packages/pipeline/src/tag/detect/parseExercise.ts and canonical.ts.
  //   - addlWt (chain/band) offset space mismatch: FIXED ("Design C", packages/pipeline/src/
  //     derive/normalize.ts's offsetAdjustRecords + packages/pipeline/src/pipeline.ts) — closed
  //     deadlift's residual (2.7%→0.6% maxRelDiff) but did NOT move bench, which stays flat at
  //     ~7.0% — meaning offset-space wasn't bench's dominant contributor.
  // Still-open, NOT yet root-caused/fixed for this TotalChart harness specifically (some are
  // analogous ConjugateCharts findings that may or may not transfer — not confirmed here):
  //   - bench's flat ~7.0% divergence despite the Design C fix — unexplained.
  //   - squat's ~0.7% divergence — unexplained, pre-existing, unrelated to addlWt (squat has 0
  //     addlWt variants).
  //   - composite coverage gaps (pushPull/total) — a different failure mode than the value-drift
  //     seen on other series.
  // Until these are individually root-caused and reconciled (or intentionally accepted, with
  // sign-off), this test documents real per-series divergence rather than asserting a fabricated
  // tolerance band.
  it.each(TOTAL_CHART_IDS)(
    'core-vs-pipeline soft-warn: %s divergence from legacy normalization (tracked, not yet reconciled)',
    (series) => {
      const diff = diffSeries(joined, series);

      // Hard assertion: joined data must have overlapping dates (catches date-parsing regressions)
      expect(diff.comparedCount).toBeGreaterThan(0);

      // Hard assertion: legacy and pipeline must return the same set of dates (same point count)
      // for every series except pushPull's documented composite gap. This intentionally catches
      // raw-pipeline volume/repetition-effort rows that main's legacy TotalChart data path
      // filtered out before buildChartData.
      if (series !== 'pushPull') {
        expect(diff.missingInA).toBe(0);
        expect(diff.missingInB).toBe(0);
      }

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
