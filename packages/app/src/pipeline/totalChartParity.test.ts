import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import type { NormalizationModel } from '@dyel/pipeline';
import type { ChartPoint, ConjugateExercise } from '@dyel/core';
import { parseConjugateData, buildSessionStats } from '@dyel/core';
import { calculateVolumeCorrelation, buildChartData, filterByDateRange } from '@dyel/api';
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
import { TOTAL_CHART_SPECS } from '@dyel/api';

const TOTAL_CHART_IDS = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];
const HARD_ASSERT_SERIES = ['squat', 'deadlift', 'pushPull', 'total'];

describe('TotalChart core-vs-pipeline parity', () => {
  let pipelineOutput: ChartPoint[] = [],
    joined: ReturnType<typeof joinChartPointsByDate> = [];
  let pipelineModel!: NormalizationModel, baselineExByType!: Map<string, ConjugateExercise>;
  const deadliftStance: 'sumo' | 'conventional' = 'sumo';

  beforeAll(() => {
    const txt = readFileSync(join(__dirname, '../../test/fixtures/total-chart-sheet.csv'), 'utf-8');
    const pairs = parseConjugateData(txt),
      tabRows = buildTabRows(extractPairs({ status: 'success', pairs })),
      eff = computeEffectiveNames(tabRows, 'sumo');
    const last = [
      ...tabRows.squat.maxEffort,
      ...tabRows.bench.maxEffort,
      ...tabRows.deadlift.maxEffort,
      ...tabRows.accessory.maxEffort,
    ].reduce<Date | null>((acc, [, s]) => {
      return !acc || s.date > acc ? s.date : acc;
    }, null);
    const dRange = !last
      ? { from: undefined, to: undefined }
      : { from: new Date(last.getFullYear(), last.getMonth() - 3, last.getDate()), to: last };

    const allSigmaPairs = [
      ...tabRows.squat.maxEffort,
      ...tabRows.bench.maxEffort,
      ...tabRows.deadlift.maxEffort,
    ];
    const filteredSigma = filterByDateRange(allSigmaPairs, dRange.from, dRange.to);
    const ui =
      dRange.from && dRange.to
        ? { dateRange: [dRange.from.getTime(), dRange.to.getTime()] as [number, number] }
        : {};

    const res = runPipeline(
      [buildRawInput('url', txt)],
      TOTAL_CHART_SPECS,
      PLACEHOLDER_ATHLETE,
      ui
    );
    pipelineOutput = mergeRechartsRowsToChartPoints(res.datasets, TOTAL_CHART_IDS, 'lbs');
    pipelineModel = res.model;

    const comp = computeBaselineTargetExercises(
      allSigmaPairs,
      eff.effectiveBaselineNames,
      eff.effectiveTargetNames
    );
    baselineExByType = comp.baselineExByType;

    const volume = calculateVolumeCorrelation([
      ...tabRows.squat.volume,
      ...tabRows.bench.volume,
      ...tabRows.deadlift.volume,
      ...tabRows.accessory.volume,
    ]);
    joined = joinChartPointsByDate(
      buildChartData(
        filteredSigma,
        baselineExByType,
        comp.targetExByType,
        buildSessionStats(allSigmaPairs, eff.effectiveBaselineNames, new Date()),
        volume
      ),
      pipelineOutput
    );
  });

  it('has data', () => {
    expect(pipelineOutput.length).toBeGreaterThan(0);
  });

  it('has valid structure', () => {
    expect(pipelineOutput[0]).toMatchObject({ date: expect.any(String) });
    expect(
      TOTAL_CHART_IDS.some((l) => {
        return l in pipelineOutput[0];
      })
    ).toBe(true);
  });

  it.each(['squat', 'bench', 'deadlift'])('baseline identity: %s agreement', (family: string) => {
    expect(
      compareBaselineIdentity(
        family,
        baselineExByType.get(family),
        pipelineModel.baseline[`lift:${family}`],
        deadliftStance
      ).matches
    ).toBe(true);
  });

  it.each(HARD_ASSERT_SERIES)('hard asserts: %s values', (series: string) => {
    const { count, values, range, ratio } = compareChartSeries(pipelineOutput, series);
    expect(count).toBeGreaterThan(0);
    expect(range).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(3);
    values.forEach((v: number) => {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(10000);
    });
  });

  it.each(TOTAL_CHART_IDS)('soft-warn: %s divergence', (series: string) => {
    const diff = diffSeries(joined, series);
    expect(diff.comparedCount).toBeGreaterThan(0);
    if (series !== 'pushPull') {
      expect(diff.missingInA).toBe(0);
      expect(diff.missingInB).toBe(0);
    }
    console.warn(
      `core-vs-pipeline ${series}: compared=${diff.comparedCount} missingInA=${diff.missingInA} missingInB=${diff.missingInB} maxAbsDiff=${diff.maxAbsDiff} maxRelDiff=${(diff.maxRelDiff * 100).toFixed(1)}%`
    );
  });

  it('soft warns on bench value variations', () => {
    const { count, values, ratio } = compareChartSeries(pipelineOutput, 'bench');
    if (!count) {
      console.warn('No bench points');
      return;
    }
    values.forEach((v) => {
      if (typeof v !== 'number' || v <= 0) {
        console.warn(`Bad bench: ${v}`);
      }
      if (v > 10000) {
        console.warn(`High bench: ${v} lbs`);
      }
    });
    if (values.length > 1 && ratio > 3) {
      console.warn(`Bench ratio gap: ${ratio.toFixed(2)}x`);
    }
    expect(count).toBeGreaterThan(0);
  });

  it('dates are in chronological order', () => {
    const dates = pipelineOutput.map((p) => {
      return new Date(p.date).getTime();
    });
    dates.forEach((d, i) => {
      if (i > 0) {
        expect(d).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });
  });

  it('all date strings are valid ISO format', () => {
    pipelineOutput.forEach((p) => {
      expect(new Date(p.date).getTime()).not.toBeNaN();
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
