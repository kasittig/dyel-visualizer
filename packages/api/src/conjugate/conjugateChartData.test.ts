import { describe, it, expect } from 'vitest';
import { buildConjugateChartData, roundBestSetsForDisplay } from './conjugateChartData';
import type { RechartsRow, ChartPoint } from '@dyel/pipeline';
import type { BestSet } from './conjugateBestSet';

const row = (t: number, overrides?: Record<string, number>): RechartsRow => ({
  t,
  ...overrides,
});

const point = (t: number, overrides?: Record<string, number>): ChartPoint => ({
  date: new Date(t).toISOString(),
  ...overrides,
});

const bestSet = (overrides?: Partial<BestSet>): BestSet => ({
  sets: 3,
  reps: 5,
  weight: 100,
  rpe: 8,
  ...overrides,
});

describe('buildConjugateChartData', () => {
  it.each([
    ['empty input', [], [], 'kg', { variations: [], data: [] }],
    [
      'single variation row',
      [row(1000, { box_squat: 300 })],
      [],
      'kg',
      {
        variations: ['box_squat'],
        data: [point(1000, { box_squat: 300 })],
      },
    ],
    [
      'multiple variations sorted alphabetically',
      [row(1000, { ssb_squat: 280, box_squat: 300 }), row(2000, { ssb_squat: 290 })],
      [],
      'kg',
      {
        variations: ['box_squat', 'ssb_squat'],
        data: [point(1000, { ssb_squat: 280, box_squat: 300 }), point(2000, { ssb_squat: 290 })],
      },
    ],
    [
      'merges variations and normalized rows by timestamp',
      [row(1000, { box_squat: 300 }), row(2000, { box_squat: 310 })],
      [row(1000, { normalized: 305 }), row(2000, { normalized: 315 })],
      'kg',
      {
        variations: ['box_squat'],
        data: [
          point(1000, { box_squat: 300, normalized: 305 }),
          point(2000, { box_squat: 310, normalized: 315 }),
        ],
      },
    ],
    [
      'converts kg to lbs and rounds',
      [row(1000, { box_squat: 100 })],
      [],
      'lbs',
      {
        variations: ['box_squat'],
        data: [point(1000, { box_squat: 220 })],
      },
    ],
    [
      'later rows override earlier rows at same timestamp',
      [row(1000, { box_squat: 300, ssb_squat: 280 }), row(1000, { box_squat: 305 })],
      [],
      'kg',
      {
        variations: ['box_squat', 'ssb_squat'],
        data: [point(1000, { box_squat: 305, ssb_squat: 280 })],
      },
    ],
  ])('buildConjugateChartData: %s', (_, variations, normalized, unit, expected) => {
    expect(buildConjugateChartData(variations, normalized, unit)).toEqual(expected);
  });
});

describe('roundBestSetsForDisplay', () => {
  it.each([
    ['empty input', new Map(), 'kg', new Map()],
    [
      'single label and date in kg',
      new Map([['box_squat', new Map([['2026-01-15T00:00:00.000Z', bestSet()]])]]),
      'kg',
      new Map([
        [
          'box_squat',
          new Map([['2026-01-15T00:00:00.000Z', { sets: 3, reps: 5, weight: 100, rpe: 8 }]]),
        ],
      ]),
    ],
    [
      'converts kg to lbs and rounds',
      new Map([['box_squat', new Map([['2026-01-15T00:00:00.000Z', bestSet({ weight: 100 })]])]]),
      'lbs',
      new Map([
        [
          'box_squat',
          new Map([['2026-01-15T00:00:00.000Z', { sets: 3, reps: 5, weight: 220, rpe: 8 }]]),
        ],
      ]),
    ],
    [
      'multiple labels',
      new Map([
        ['box_squat', new Map([['2026-01-15T00:00:00.000Z', bestSet({ weight: 100 })]])],
        ['ssb_squat', new Map([['2026-01-15T00:00:00.000Z', bestSet({ weight: 90 })]])],
      ]),
      'lbs',
      new Map([
        [
          'box_squat',
          new Map([['2026-01-15T00:00:00.000Z', { sets: 3, reps: 5, weight: 220, rpe: 8 }]]),
        ],
        [
          'ssb_squat',
          new Map([['2026-01-15T00:00:00.000Z', { sets: 3, reps: 5, weight: 198, rpe: 8 }]]),
        ],
      ]),
    ],
    [
      'preserves all BestSet fields including null rpe',
      new Map([
        ['box_squat', new Map([['2026-01-15T00:00:00.000Z', bestSet({ rpe: null, weight: 80 })]])],
      ]),
      'lbs',
      new Map([
        [
          'box_squat',
          new Map([['2026-01-15T00:00:00.000Z', { sets: 3, reps: 5, weight: 176, rpe: null }]]),
        ],
      ]),
    ],
  ])('roundBestSetsForDisplay: %s', (_, input, unit, expected) => {
    expect(roundBestSetsForDisplay(input, unit)).toEqual(expected);
  });
});
