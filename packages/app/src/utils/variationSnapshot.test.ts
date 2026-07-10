import { describe, it, expect } from 'vitest';
import { snapshotVariationsFromPipeline } from './variationSnapshot';
import type { RechartsRow } from '@dyel/pipeline';

describe('snapshotVariationsFromPipeline', () => {
  const KG_TO_LBS = 2.20462262185;

  it.each([
    ['empty rows', [], {}, 'lbs'],
    [
      'single row lbs',
      [{ t: 1000, squat: 100, bench: 80 }] as RechartsRow[],
      { squat: Math.round(100 * KG_TO_LBS), bench: Math.round(80 * KG_TO_LBS) },
      'lbs',
    ],
    [
      'single row kg',
      [{ t: 1000, squat: 100, bench: 80 }] as RechartsRow[],
      { squat: 100, bench: 80 },
      'kg',
    ],
    [
      'multiple rows uses latest by timestamp',
      [
        { t: 1000, squat: 100, bench: 80 },
        { t: 2000, squat: 110, bench: 90 },
        { t: 1500, squat: 105, bench: 85 },
      ] as RechartsRow[],
      { squat: Math.round(110 * KG_TO_LBS), bench: Math.round(90 * KG_TO_LBS) },
      'lbs',
    ],
    [
      'skips non-numeric values',
      [{ t: 1000, squat: 100, note: 'test', bench: 80 }] as RechartsRow[],
      { squat: Math.round(100 * KG_TO_LBS), bench: Math.round(80 * KG_TO_LBS) },
      'lbs',
    ],
    [
      'collects all variations from different dates (sparse per-day data)',
      [
        { t: 1000, Bench: 90 },
        { t: 2000, 'Bench (2 board)': 85 },
        { t: 3000, 'Bench (Slingshot)': 95 },
        { t: 1500, 'Bench (chains)': 80 },
      ] as RechartsRow[],
      {
        Bench: Math.round(90 * KG_TO_LBS),
        'Bench (2 board)': Math.round(85 * KG_TO_LBS),
        'Bench (Slingshot)': Math.round(95 * KG_TO_LBS),
        'Bench (chains)': Math.round(80 * KG_TO_LBS),
      },
      'lbs',
    ],
    [
      'same variation key appears in multiple rows - uses latest value',
      [
        { t: 1000, Bench: 80 },
        { t: 2000, Bench: 85 },
        { t: 3000, Bench: 90 },
      ] as RechartsRow[],
      { Bench: Math.round(90 * KG_TO_LBS) },
      'lbs',
    ],
  ])('extracts snapshot %s', (_, rows, expected, unit) => {
    expect(snapshotVariationsFromPipeline(rows, unit as 'lbs' | 'kg')).toEqual(expected);
  });
});
