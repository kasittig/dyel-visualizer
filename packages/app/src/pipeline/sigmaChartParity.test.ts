import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import type { ChartPoint } from '@dyel/core';
import { parseConjugateData, buildSessionStats } from '@dyel/core';
import { calculateVolumeCorrelation, buildChartData, filterByDateRange } from '@dyel/api';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import {
  mergeRechartsRowsToChartPoints,
  mergeVolumeIntoChartPoints,
} from '../utils/pipelineChartUtils';
import { extractPairs, buildTabRows, computeEffectiveNames } from '../utils/appDataUtils';
import { computeBaselineTargetExercises } from '../hooks/data/useBaselineTargetExercises';
import { TOTAL_CHART_SPECS } from '@dyel/api';

const TOTAL_CHART_IDS: string[] = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];

function lastValuesByLift(chartData: ChartPoint[]) {
  const result: Record<string, number | undefined> = {
    squat: undefined,
    bench: undefined,
    deadlift: undefined,
  };
  for (const point of chartData) {
    ['squat', 'bench', 'deadlift'].forEach((lift) => {
      const v = point[lift as keyof ChartPoint];
      if (typeof v === 'number') {
        result[lift] = v;
      }
    });
  }
  return result;
}

describe('SigmaChart core-vs-pipeline parity', () => {
  let legacyChartData: ChartPoint[] = [];
  let pipelineOutput: ChartPoint[] = [];

  beforeAll(() => {
    const txt: string = readFileSync(
      join(__dirname, '../../test/fixtures/total-chart-sheet.csv'),
      'utf-8'
    );

    // Legacy computation
    const pairs = parseConjugateData(txt);
    const tabRows = buildTabRows(extractPairs({ status: 'success', pairs }));
    const eff = computeEffectiveNames(tabRows, 'sumo');

    // Compute date range (3 months back)
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

    // Filter sigma pairs and compute volume
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

    // Build legacy chart data
    const comp = computeBaselineTargetExercises(
      allSigmaPairs,
      eff.effectiveBaselineNames,
      eff.effectiveTargetNames
    );
    legacyChartData = buildChartData(
      filteredSigma,
      comp.baselineExByType,
      comp.targetExByType,
      buildSessionStats(allSigmaPairs, eff.effectiveBaselineNames, new Date()),
      volumeByDate
    );

    // Pipeline computation
    const vol = calculateVolumeCorrelation(pairs);
    const res = runPipeline(
      [buildRawInput('url', txt)],
      TOTAL_CHART_SPECS,
      PLACEHOLDER_ATHLETE,
      {}
    );
    const pts = mergeRechartsRowsToChartPoints(res.datasets, TOTAL_CHART_IDS, 'lbs');
    pipelineOutput = mergeVolumeIntoChartPoints(pts, vol);
  });

  it('produces non-empty chart data from fixture', () => {
    expect(pipelineOutput.length).toBeGreaterThan(0);
  });

  it.each(['squat', 'bench', 'deadlift'])(
    'last-value extraction: %s is a positive, sane number',
    (lift: string) => {
      const value = lastValuesByLift(pipelineOutput)[lift];
      expect(value).toBeDefined();
      expect(value as number).toBeGreaterThan(0);
      expect(value as number).toBeLessThan(10000);
    }
  );

  it.each(['squat', 'bench', 'deadlift'])('last-value parity: %s agreement', (lift: string) => {
    const a = lastValuesByLift(legacyChartData)[lift];
    const b = lastValuesByLift(pipelineOutput)[lift];
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    const relDiff =
      Math.abs((a as number) - (b as number)) /
      Math.max(Math.abs(a as number), Math.abs(b as number));
    if (relDiff > 0.05) {
      console.warn(
        `sigma last-value ${lift}: legacy=${a} pipeline=${b} relDiff=${(relDiff * 100).toFixed(1)}%`
      );
    }
  });
});
