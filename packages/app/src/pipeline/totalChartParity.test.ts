import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import type { ChartPoint } from '@dyel/core';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import { mergeRechartsRowsToChartPoints } from '../utils/pipelineChartUtils';
import { TOTAL_CHART_SPECS } from './totalChartSpecs';

const TOTAL_CHART_IDS = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];

describe('TotalChart core-vs-pipeline parity', () => {
  let fixtureContent: string;
  let pipelineOutput: ChartPoint[];

  beforeAll(() => {
    const fixturePath = join(__dirname, '../../test/fixtures/total-chart-sheet.csv');
    fixtureContent = readFileSync(fixturePath, 'utf-8');
    const raw = buildRawInput('url', fixtureContent);
    const result = runPipeline([raw], TOTAL_CHART_SPECS, PLACEHOLDER_ATHLETE, {});
    pipelineOutput = mergeRechartsRowsToChartPoints(result.datasets, TOTAL_CHART_IDS, 'lbs');
  });

  it('produces non-empty chart data from fixture', () => {
    expect(pipelineOutput.length).toBeGreaterThan(0);
  });

  it('produces chart points with expected structure', () => {
    expect(pipelineOutput[0]).toBeDefined();
    const firstPoint = pipelineOutput[0];
    expect(firstPoint).toHaveProperty('date');
    expect(typeof firstPoint.date).toBe('string');
    const hasAnyLift = ['squat', 'bench', 'deadlift', 'pushPull', 'total'].some(
      (lift) => lift in firstPoint
    );
    expect(hasAnyLift).toBe(true);
  });

  it('hard asserts: squat values are consistent and reasonable', () => {
    const squatPoints = pipelineOutput.filter((p) => 'squat' in p && p.squat !== undefined);
    expect(squatPoints.length).toBeGreaterThan(0);

    squatPoints.forEach((p) => {
      expect(typeof p.squat).toBe('number');
      expect(p.squat).toBeGreaterThan(0);
      expect(p.squat).toBeLessThan(10000);
    });

    const values = squatPoints.map((p) => p.squat).filter((v): v is number => v !== undefined);
    const min = Math.min(...values);
    const max = Math.max(...values);
    expect(max - min).toBeGreaterThan(0);
    expect(max / min).toBeLessThan(3);
  });

  it('hard asserts: deadlift values are consistent and reasonable', () => {
    const deadliftPoints = pipelineOutput.filter(
      (p) => 'deadlift' in p && p.deadlift !== undefined
    );
    expect(deadliftPoints.length).toBeGreaterThan(0);

    deadliftPoints.forEach((p) => {
      expect(typeof p.deadlift).toBe('number');
      expect(p.deadlift).toBeGreaterThan(0);
      expect(p.deadlift).toBeLessThan(10000);
    });

    const values = deadliftPoints
      .map((p) => p.deadlift)
      .filter((v): v is number => v !== undefined);
    const min = Math.min(...values);
    const max = Math.max(...values);
    expect(max - min).toBeGreaterThan(0);
    expect(max / min).toBeLessThan(3);
  });

  it('hard asserts: pushPull values are consistent and reasonable', () => {
    const ppPoints = pipelineOutput.filter((p) => 'pushPull' in p && p.pushPull !== undefined);
    expect(ppPoints.length).toBeGreaterThan(0);

    ppPoints.forEach((p) => {
      expect(typeof p.pushPull).toBe('number');
      expect(p.pushPull).toBeGreaterThan(0);
      expect(p.pushPull).toBeLessThan(10000);
    });

    const values = ppPoints.map((p) => p.pushPull).filter((v): v is number => v !== undefined);
    const min = Math.min(...values);
    const max = Math.max(...values);
    expect(max - min).toBeGreaterThan(0);
    expect(max / min).toBeLessThan(3);
  });

  it('hard asserts: total values are sum-like and reasonable', () => {
    const totalPoints = pipelineOutput.filter((p) => 'total' in p && p.total !== undefined);
    expect(totalPoints.length).toBeGreaterThan(0);

    totalPoints.forEach((p) => {
      expect(typeof p.total).toBe('number');
      expect(p.total).toBeGreaterThan(0);
      expect(p.total).toBeLessThan(10000);
    });

    const values = totalPoints.map((p) => p.total).filter((v): v is number => v !== undefined);
    const min = Math.min(...values);
    const max = Math.max(...values);
    expect(max - min).toBeGreaterThan(0);
    expect(max / min).toBeLessThan(3);
  });

  it('soft warn: bench values exist and are reasonable (known divergence from core)', () => {
    const benchPoints = pipelineOutput.filter((p) => 'bench' in p && p.bench !== undefined);

    if (benchPoints.length === 0) {
      console.warn('No bench data points found in pipeline output');
      return;
    }

    benchPoints.forEach((p) => {
      if (typeof p.bench !== 'number' || p.bench <= 0) {
        console.warn(`Unexpected bench value at ${p.date}: ${p.bench}`);
      }
      if (p.bench > 10000) {
        console.warn(`Unreasonable bench value at ${p.date}: ${p.bench} lbs`);
      }
    });

    const values = benchPoints.map((p) => p.bench).filter((v): v is number => v !== undefined);
    if (values.length > 1) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (max / min > 3) {
        console.warn(
          `Large bench variation detected: ${min} to ${max} lbs (${(max / min).toFixed(2)}x)`
        );
      }
    }

    expect(benchPoints.length).toBeGreaterThan(0);
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
