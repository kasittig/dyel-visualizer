/**
 * Pipeline-output sanity/regression test for SessionBarChart.
 *
 * SessionBarChart has no independent aggregation logic of its own — it is a presentation-only
 * shell that renders whatever ChartPoint[] it is handed (squat/bench/deadlift/volume bars, with
 * volume labeled "Accessory Volume"). This is NOT a legacy-vs-pipeline diff (see
 * sigmaTabParity.test.ts for that intentional exception); it just asserts the pipeline-derived
 * ChartPoint[] built the same way the app builds it is well-formed for the series this component
 * actually renders.
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
// Lift series (squat/bench/deadlift) are e1RM-normalized single-rep weights; volume is a summed
// weight*reps accessory total, so it lives on a much larger scale. Bound each accordingly.
const SESSION_BAR_SERIES: [series: string, upperBound: number][] = [
  ['squat', 10000],
  ['bench', 10000],
  ['deadlift', 10000],
  ['volume', 100000],
];

describe('SessionBarChart pipeline data sanity', () => {
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

  it.each(SESSION_BAR_SERIES)(
    'hard asserts: %s values are consistent and reasonable',
    (series, upperBound) => {
      const { count, values } = compareChartSeries(pipelineOutput, series);
      expect(count).toBeGreaterThan(0);
      values.forEach((v) => {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(upperBound);
      });
    }
  );

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
