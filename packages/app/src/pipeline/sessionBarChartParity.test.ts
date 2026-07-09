import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import type { ChartPoint } from '@dyel/core';
import { parseConjugateData, buildSessionStats } from '@dyel/core';
import {
  calculateVolumeCorrelation,
  buildChartData,
  filterByDateRange,
  TOTAL_CHART_SPECS,
} from '@dyel/api';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import {
  mergeRechartsRowsToChartPoints,
  mergeVolumeIntoChartPoints,
} from '../utils/pipelineChartUtils';
import { compareChartSeries } from '../testUtils/compareChartSeries';
import { joinChartPointsByDate, diffSeries } from '../testUtils/diffChartSeries';
import { extractPairs, buildTabRows, computeEffectiveNames } from '../utils/appDataUtils';
import { computeBaselineTargetExercises } from '../hooks/data/useBaselineTargetExercises';

const TOTAL_CHART_IDS: string[] = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];
const SESSION_BAR_SERIES: [string, number][] = [
  ['squat', 10000],
  ['bench', 10000],
  ['deadlift', 10000],
  ['volume', 100000],
];

describe('SessionBarChart core-vs-pipeline parity', () => {
  let pipelineOutput: ChartPoint[] = [];
  let joined: ReturnType<typeof joinChartPointsByDate> = [];

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
    const volumeByDate = calculateVolumeCorrelation([
      ...tabRows.squat.volume,
      ...tabRows.bench.volume,
      ...tabRows.deadlift.volume,
      ...tabRows.accessory.volume,
    ]);

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
    pipelineOutput = mergeVolumeIntoChartPoints(
      mergeRechartsRowsToChartPoints(res.datasets, TOTAL_CHART_IDS, 'lbs'),
      volumeByDate
    );

    const comp = computeBaselineTargetExercises(
      allSigmaPairs,
      eff.effectiveBaselineNames,
      eff.effectiveTargetNames
    );
    joined = joinChartPointsByDate(
      buildChartData(
        filteredSigma,
        comp.baselineExByType,
        comp.targetExByType,
        buildSessionStats(allSigmaPairs, eff.effectiveBaselineNames, new Date()),
        volumeByDate
      ),
      pipelineOutput
    );
  });

  it('produces non-empty chart data from fixture', () => {
    expect(pipelineOutput.length).toBeGreaterThan(0);
  });

  it.each(SESSION_BAR_SERIES)(
    'hard asserts: %s values are consistent and reasonable',
    (series: string, upperBound: number) => {
      const { count, values } = compareChartSeries(pipelineOutput, series);
      expect(count).toBeGreaterThan(0);
      values.forEach((v: number) => {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(upperBound);
      });
    }
  );

  it('dates are in chronological order', () => {
    const dates: number[] = pipelineOutput.map((p: ChartPoint) => {
      return new Date(p.date).getTime();
    });
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });

  it('all date strings are valid ISO format', () => {
    pipelineOutput.forEach((p: ChartPoint) => {
      expect(new Date(p.date).getTime()).not.toBeNaN();
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  it.each(['squat', 'deadlift'])('soft-warn: %s divergence', (series: string) => {
    const diff = diffSeries(joined, series);
    expect(diff.comparedCount).toBeGreaterThan(0);
    console.warn(
      `core-vs-pipeline ${series}: compared=${diff.comparedCount} missingInA=${diff.missingInA} missingInB=${diff.missingInB} maxAbsDiff=${diff.maxAbsDiff} maxRelDiff=${(diff.maxRelDiff * 100).toFixed(1)}%`
    );
  });

  it('volume series matches exactly', () => {
    expect(diffSeries(joined, 'volume')).toMatchObject({
      maxAbsDiff: 0,
      missingInA: 0,
      missingInB: 0,
    });
  });
});
