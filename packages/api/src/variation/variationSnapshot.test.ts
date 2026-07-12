import { describe, it, expect } from 'vitest';
import {
  snapshotVariationsFromPipeline,
  snapshotNormalizedVariationsFromPipeline,
} from './variationSnapshot';
import type { RechartsRow, NormalizationModel } from '@dyel/pipeline';

const LBS_MUL = 2.20462262185;
const lbs = (kg: number) => Math.round(kg * LBS_MUL);

describe('snapshotVariationsFromPipeline', () => {
  it.each([
    ['empty rows', [], {}, 'lbs'],
    [
      'single row lbs',
      [{ t: 1000, squat: 100, bench: 80 }],
      { squat: lbs(100), bench: lbs(80) },
      'lbs',
    ],
    ['single row kg', [{ t: 1000, squat: 100, bench: 80 }], { squat: 100, bench: 80 }, 'kg'],
    [
      'latest timestamp wins',
      [
        { t: 1000, squat: 100 },
        { t: 2000, squat: 110 },
        { t: 1500, squat: 105 },
      ],
      { squat: lbs(110) },
      'lbs',
    ],
    [
      'skips non-numeric values',
      [{ t: 1000, squat: 100, note: 'str' }],
      { squat: lbs(100) },
      'lbs',
    ],
    [
      'sparse multi-day data',
      [
        { t: 1000, B: 90 },
        { t: 2000, 'B-b': 85 },
      ],
      { B: lbs(90), 'B-b': lbs(85) },
      'lbs',
    ],
  ])('%s', (_, rows, expected, unit) => {
    expect(snapshotVariationsFromPipeline(rows as RechartsRow[], unit as 'lbs' | 'kg')).toEqual(
      expected
    );
  });
});

describe('snapshotNormalizedVariationsFromPipeline', () => {
  const mockModel = (vf?: Record<string, { factor: number; n: number }>): NormalizationModel => ({
    fittedAt: 1000,
    baseline: { 'lift:bench': 'bench' },
    variantFactor: vf ?? {},
    addlWtOffset: {},
  });

  it.each([
    [
      'normalizes correctly',
      [{ t: 1000, Bench: 100, 'B-p': 90 }],
      new Map([
        ['Bench', 'bench'],
        ['B-p', 'bench-pause'],
      ]),
      mockModel({ 'bench-pause': { factor: 0.9, n: 5 } }),
      { Bench: lbs(100), 'B-p': lbs(100) },
      'lbs',
    ],
    [
      'excludes missing canonical mapping',
      [{ t: 1000, Bench: 100, Unknown: 80 }],
      new Map([['Bench', 'bench']]),
      mockModel(),
      { Bench: lbs(100) },
      'lbs',
    ],
    [
      'excludes unfitted variants',
      [{ t: 1000, Bench: 100, Exotic: 85 }],
      new Map([
        ['Bench', 'bench'],
        ['Exotic', 'bench-exotic'],
      ]),
      mockModel(),
      { Bench: lbs(100) },
      'lbs',
    ],
    [
      'kg unit skip scale',
      [{ t: 1000, Bench: 100 }],
      new Map([['Bench', 'bench']]),
      mockModel(),
      { Bench: 100 },
      'kg',
    ],
    [
      'latest row values win',
      [
        { t: 1000, Bench: 100 },
        { t: 2000, Bench: 110 },
      ],
      new Map([['Bench', 'bench']]),
      mockModel(),
      { Bench: lbs(110) },
      'lbs',
    ],
  ])('%s', (_, rows, labelMap, model, expected, unit) => {
    expect(
      snapshotNormalizedVariationsFromPipeline(
        rows as RechartsRow[],
        labelMap,
        model,
        unit as 'lbs' | 'kg'
      )
    ).toEqual(expected);
  });
});
