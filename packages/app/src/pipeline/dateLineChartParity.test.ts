import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import type { ChartPoint } from '@dyel/core';
import { parseConjugateData } from '@dyel/core';
import { calculateVolumeCorrelation } from '@dyel/api';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import {
  mergeRechartsRowsToChartPoints,
  mergeVolumeIntoChartPoints,
} from '../utils/pipelineChartUtils';
import { compareChartSeries } from '../testUtils/compareChartSeries';
import { TOTAL_CHART_SPECS } from '../../../api/src/totalChartSpecs';

const TOTAL_CHART_IDS: string[] = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];

describe('DateLineChart pipeline data sanity', () => {
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

  it.each(TOTAL_CHART_IDS)(
    'hard asserts: %s values are consistent and reasonable',
    (series: string) => {
      const { count, values } = compareChartSeries(pipelineOutput, series);
      expect(count).toBeGreaterThan(0);
      values.forEach((v: number) => {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(10000);
      });
    }
  );

  it('dates are in chronological order', () => {
    const dates: number[] = pipelineOutput.map((p: ChartPoint) => new Date(p.date).getTime());
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
