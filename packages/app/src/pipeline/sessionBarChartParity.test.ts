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
import { compareChartSeries } from '../testUtils/compareChartSeries';
import { TOTAL_CHART_SPECS } from '../../../api/src/totalChartSpecs';

const TOTAL_CHART_IDS: string[] = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];
const SESSION_BAR_SERIES: [string, number][] = [
  ['squat', 10000],
  ['bench', 10000],
  ['deadlift', 10000],
  ['volume', 100000],
];

describe('SessionBarChart pipeline data sanity', () => {
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
});
