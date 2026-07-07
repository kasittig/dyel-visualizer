/**
 * Pipeline-output sanity/regression test for DateLineChart.
 *
 * DateLineChart is the shared shell consumed by TotalChart (squat/bench/deadlift/pushPull/total)
 * and SigmaTab's Σ line usage; it has no independent aggregation logic of its own — it renders
 * whatever ChartPoint[] it is handed. This is NOT a legacy-vs-pipeline diff (see
 * sigmaTabParity.test.ts for that intentional exception); it's a smoke/regression check that the
 * pipeline-derived ChartPoint[] shape underlying the shell is well-formed for all series it may
 * be asked to render.
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
import { compareChartSeries } from '../testUtils/compareChartSeries';
import { TOTAL_CHART_SPECS } from './totalChartSpecs';

const TOTAL_CHART_IDS = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];

describe('DateLineChart pipeline data sanity', () => {
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

  it.each(TOTAL_CHART_IDS)('hard asserts: %s values are consistent and reasonable', (series) => {
    const { count, values } = compareChartSeries(pipelineOutput, series);
    expect(count).toBeGreaterThan(0);
    values.forEach((v) => {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(10000);
    });
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
