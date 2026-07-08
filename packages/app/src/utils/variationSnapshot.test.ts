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
      'handles partial data per variation',
      [
        { t: 1000, squat: 100 },
        { t: 2000, bench: 90 },
      ] as RechartsRow[],
      { bench: Math.round(90 * KG_TO_LBS) },
      'lbs',
    ],
  ])('extracts snapshot %s', (_, rows, expected, unit) => {
    expect(snapshotVariationsFromPipeline(rows, unit as 'lbs' | 'kg')).toEqual(expected);
  });
});
