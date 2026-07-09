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
import { TOTAL_CHART_SPECS } from '../../../api/src/totalChartSpecs';

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

describe('SigmaChart pipeline data sanity', () => {
  let pipelineOutput: ChartPoint[] = [];

  beforeAll(() => {
    const txt: string = readFileSync(
      join(__dirname, '../../test/fixtures/total-chart-sheet.csv'),
      'utf-8'
    );
    const vol = calculateVolumeCorrelation(parseConjugateData(txt));
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
});
