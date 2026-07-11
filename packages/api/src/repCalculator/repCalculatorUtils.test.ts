import { describe, it, expect } from 'vitest';
import type { Point, NormalizationModel } from '@dyel/pipeline';
import {
  selectBestE1RMPoint,
  findBestE1RMFromPipeline,
  resolveE1RMEstimate,
  roundTo5,
} from './repCalculatorUtils';

// Mock factory functions
const point = (series: string, value: number, timestamp: number): Point => ({
  series,
  v: value,
  t: timestamp,
});

const model = (overrides?: Partial<NormalizationModel>): NormalizationModel => ({
  baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench', 'lift:deadlift': 'deadlift' },
  variantFactor: {},
  addlWtOffset: {},
  ...overrides,
});

describe('selectBestE1RMPoint', () => {
  it.each([
    ['empty array', [], null],
    ['single point', [point('squat', 300, 1000)], { e1rm: 300, t: 1000 }],
    [
      'multiple points picks max',
      [point('squat', 250, 1000), point('squat', 300, 2000), point('squat', 280, 3000)],
      { e1rm: 300, t: 2000 },
    ],
  ])('handles %s', (_, points, expected) => {
    expect(selectBestE1RMPoint(points)).toEqual(expected);
  });
});

describe('findBestE1RMFromPipeline', () => {
  const today = new Date('2024-01-15');
  const baselinePoints = [point('squat', 250, 1000000000), point('squat', 280, 1000000000000)];

  it.each([
    [
      'missing baseline source name',
      {
        targetCanonical: 'squat',
        baselineCanonical: 'squat',
        baselineE1RMPoints: baselinePoints,
        today,
        model: model(),
        baselineSourceName: '',
      },
      null,
    ],
    [
      'exact match (same canonical)',
      {
        targetCanonical: 'squat',
        baselineCanonical: 'squat',
        baselineE1RMPoints: baselinePoints,
        today,
        model: model(),
        baselineSourceName: 'Competition Squat',
      },
      expect.objectContaining({
        method: 'exact',
        sourceName: 'Competition Squat',
      }),
    ],
    [
      'variant factor projection',
      {
        targetCanonical: 'squat-pause',
        baselineCanonical: 'squat',
        baselineE1RMPoints: baselinePoints,
        today,
        model: model({
          variantFactor: {
            'squat-pause': { factor: 0.85, n: 10 },
          },
        }),
        baselineSourceName: 'Squat',
      },
      expect.objectContaining({
        method: 'variantFactor',
        sourceName: 'Squat',
      }),
    ],
    [
      'missing variant factor returns null',
      {
        targetCanonical: 'squat-unknown',
        baselineCanonical: 'squat',
        baselineE1RMPoints: baselinePoints,
        today,
        model: model(),
        baselineSourceName: 'Squat',
      },
      null,
    ],
    [
      'variant factor with zero factor returns null',
      {
        targetCanonical: 'squat-bad',
        baselineCanonical: 'squat',
        baselineE1RMPoints: baselinePoints,
        today,
        model: model({
          variantFactor: {
            'squat-bad': { factor: 0, n: 5 },
          },
        }),
        baselineSourceName: 'Squat',
      },
      null,
    ],
    [
      'empty baseline points returns null',
      {
        targetCanonical: 'squat',
        baselineCanonical: 'squat',
        baselineE1RMPoints: [],
        today,
        model: model(),
        baselineSourceName: 'Squat',
      },
      null,
    ],
  ])('%s', (_, input, expected) => {
    const result = findBestE1RMFromPipeline(
      input.targetCanonical,
      input.baselineCanonical,
      input.baselineE1RMPoints,
      input.today,
      input.model,
      input.baselineSourceName
    );
    if (expected === null) {
      expect(result).toBeNull();
    } else {
      expect(result).toEqual(expected);
    }
  });
});

describe('resolveE1RMEstimate', () => {
  const today = new Date('2024-01-15');
  const e1rmPoints = [point('squat', 250, 1000000000), point('squat', 280, 1000000000000)];

  it.each([
    [
      'no baseline in model',
      {
        liftType: 'squat',
        targetCanonical: 'squat',
        baselineName: 'Competition Squat',
        today,
        model: model({ baseline: {} }),
        e1rmPoints,
      },
      null,
    ],
    [
      'baseline exists but no matching points',
      {
        liftType: 'squat',
        targetCanonical: 'squat',
        baselineName: 'Competition Squat',
        today,
        model: model(),
        e1rmPoints: [point('bench', 200, 1000000000)],
      },
      null,
    ],
    [
      'delegates to findBestE1RMFromPipeline with exact match',
      {
        liftType: 'squat',
        targetCanonical: 'squat',
        baselineName: 'My Squat',
        today,
        model: model(),
        e1rmPoints,
      },
      expect.objectContaining({
        sourceName: 'My Squat',
        method: 'exact',
      }),
    ],
    [
      'uses canonical when baselineName is null',
      {
        liftType: 'squat',
        targetCanonical: 'squat',
        baselineName: null,
        today,
        model: model(),
        e1rmPoints,
      },
      expect.objectContaining({
        sourceName: 'squat',
        method: 'exact',
      }),
    ],
    [
      'delegates variant factor to findBestE1RMFromPipeline',
      {
        liftType: 'squat',
        targetCanonical: 'squat-pause',
        baselineName: 'Squat',
        today,
        model: model({
          variantFactor: {
            'squat-pause': { factor: 0.85, n: 10 },
          },
        }),
        e1rmPoints,
      },
      expect.objectContaining({
        method: 'variantFactor',
      }),
    ],
  ])('%s', (_, params, expected) => {
    const result = resolveE1RMEstimate(params);
    if (expected === null) {
      expect(result).toBeNull();
    } else {
      expect(result).toEqual(expected);
    }
  });
});

describe('roundTo5', () => {
  it.each([
    ['exact multiple', 25, 25],
    ['exact multiple 100', 100, 100],
    ['rounds down 22', 22, 20],
    ['rounds up 23', 23, 25],
    ['rounds up 27', 27, 25],
    ['rounds down 28', 28, 30],
    ['zero', 0, 0],
    ['negative rounds down', -22, -20],
    ['negative rounds up', -23, -25],
    ['decimal 22.4', 22.4, 20],
    ['decimal 22.6', 22.6, 25],
  ])('%s', (_, input, expected) => {
    expect(roundTo5(input)).toBe(expected);
  });
});
