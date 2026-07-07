/**
 * Pipeline-output sanity/regression test for SigmaChart.
 *
 * SigmaChart has no independent aggregation logic of its own — it derives its display data by
 * taking the LAST non-undefined value of squat/bench/deadlift across the ChartPoint[] array it is
 * handed (see the `useMemo` in components/charts/SigmaChart.tsx). This is NOT a legacy-vs-pipeline
 * diff (see sigmaTabParity.test.ts for that intentional exception); it replicates that same
 * last-value extraction over pipeline-derived fixture data and asserts the result is sane.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import type { ChartPoint } from '@dyel/core';
import { parseConjugateData, calculateVolumeCorrelation } from '@dyel/core';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import {
  mergeRechartsRowsToChartPoints,
  mergeVolumeIntoChartPoints,
} from '../utils/pipelineChartUtils';
import { TOTAL_CHART_SPECS } from './totalChartSpecs';

const TOTAL_CHART_IDS = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];

/** Mirrors SigmaChart's own useMemo: last non-undefined value per lift, in array order. */
function lastValuesByLift(chartData: ChartPoint[]) {
  let lastSquat: number | undefined;
  let lastBench: number | undefined;
  let lastDeadlift: number | undefined;
  for (const point of chartData) {
    if (point.squat !== undefined) {
      lastSquat = point.squat as number;
    }
    if (point.bench !== undefined) {
      lastBench = point.bench as number;
    }
    if (point.deadlift !== undefined) {
      lastDeadlift = point.deadlift as number;
    }
  }
  return { squat: lastSquat, bench: lastBench, deadlift: lastDeadlift };
}

describe('SigmaChart pipeline data sanity', () => {
  let pipelineOutput: ChartPoint[];

  beforeAll(() => {
    const fixturePath = join(__dirname, '../../test/fixtures/total-chart-sheet.csv');
    const fixtureContent = readFileSync(fixturePath, 'utf-8');

    const pairs = parseConjugateData(fixtureContent);
    const volumeByDate = calculateVolumeCorrelation(pairs);

    const raw = buildRawInput('url', fixtureContent);
    const result = runPipeline([raw], TOTAL_CHART_SPECS, PLACEHOLDER_ATHLETE, {});
    pipelineOutput = mergeRechartsRowsToChartPoints(result.datasets, TOTAL_CHART_IDS, 'lbs');
    pipelineOutput = mergeVolumeIntoChartPoints(pipelineOutput, volumeByDate);
  });

  it('produces non-empty chart data from fixture', () => {
    expect(pipelineOutput.length).toBeGreaterThan(0);
  });

  it.each(['squat', 'bench', 'deadlift'])(
    'last-value extraction: %s is a positive, sane number',
    (lift) => {
      const lastValues = lastValuesByLift(pipelineOutput);
      const value = lastValues[lift as keyof typeof lastValues];
      expect(value).toBeDefined();
      expect(value as number).toBeGreaterThan(0);
      expect(value as number).toBeLessThan(10000);
    }
  );
});
