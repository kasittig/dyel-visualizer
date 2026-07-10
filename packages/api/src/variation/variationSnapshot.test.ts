import { describe, it, expect } from 'vitest';
import {
  snapshotVariationsFromPipeline,
  snapshotNormalizedVariationsFromPipeline,
} from './variationSnapshot';
import type { RechartsRow, NormalizationModel } from '@dyel/pipeline';

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

describe('snapshotNormalizedVariationsFromPipeline', () => {
  const KG_TO_LBS = 2.20462262185;

  // Factory: create a NormalizationModel with the given baseline and variant factors
  const model = (overrides?: {
    baseline?: Record<string, string>;
    variantFactor?: Record<string, { factor: number; n: number }>;
  }): NormalizationModel => ({
    fittedAt: Date.now(),
    baseline: overrides?.baseline ?? { 'lift:bench': 'bench' },
    variantFactor: overrides?.variantFactor ?? {},
    addlWtOffset: {},
  });

  it.each([
    [
      'normal case - a label normalizes correctly against a simple model',
      [{ t: 1000, Bench: 100, 'Bench (Pause)': 90 }] as RechartsRow[],
      new Map([
        ['Bench', 'bench'],
        ['Bench (Pause)', 'bench-pause'],
      ]),
      model({ variantFactor: { 'bench-pause': { factor: 0.9, n: 5 } } }),
      // 'Bench': 100 / 1.0 (baseline factor) = 100 kg = ~220 lbs
      // 'Bench (Pause)': 90 / 0.9 = 100 kg = ~220 lbs
      { Bench: Math.round(100 * KG_TO_LBS), 'Bench (Pause)': Math.round(100 * KG_TO_LBS) },
      'lbs',
    ],
    [
      'label with no canonical mapping is excluded from result',
      [{ t: 1000, Bench: 100, 'Unknown Lift': 80 }] as RechartsRow[],
      new Map([['Bench', 'bench']]),
      model(),
      // 'Unknown Lift' has no canonical mapping, so it's omitted
      { Bench: Math.round(100 * KG_TO_LBS) },
      'lbs',
    ],
    [
      'canonical with no fitted variantFactor (normalizeE1rm returns null) is excluded',
      [{ t: 1000, Bench: 100, 'Bench (Exotic)': 85 }] as RechartsRow[],
      new Map([
        ['Bench', 'bench'],
        ['Bench (Exotic)', 'bench-exotic'],
      ]),
      // model with no variantFactor for bench-exotic means normalizeE1rm returns null
      model({ variantFactor: {} }),
      // Only 'Bench' (baseline) is included; 'Bench (Exotic)' unfitted is omitted
      { Bench: Math.round(100 * KG_TO_LBS) },
      'lbs',
    ],
    [
      'unit conversion lbs produces expected ~2.2x ratio',
      [{ t: 1000, Bench: 100 }] as RechartsRow[],
      new Map([['Bench', 'bench']]),
      model(),
      // 100 kg in lbs
      { Bench: Math.round(100 * KG_TO_LBS) },
      'lbs',
    ],
    [
      'unit conversion kg returns raw normalized value',
      [{ t: 1000, Bench: 100 }] as RechartsRow[],
      new Map([['Bench', 'bench']]),
      model(),
      // 100 kg in kg
      { Bench: 100 },
      'kg',
    ],
    [
      'multiple rows uses latest value per label before normalizing',
      [
        { t: 1000, Bench: 100 },
        { t: 2000, Bench: 110 },
        { t: 1500, Bench: 105 },
      ] as RechartsRow[],
      new Map([['Bench', 'bench']]),
      model(),
      // Latest value is 110 kg
      { Bench: Math.round(110 * KG_TO_LBS) },
      'lbs',
    ],
  ])('normalizes snapshot %s', (_, rows, canonicalByLabel, normModel, expected, unit) => {
    expect(
      snapshotNormalizedVariationsFromPipeline(
        rows,
        canonicalByLabel,
        normModel,
        unit as 'lbs' | 'kg'
      )
    ).toEqual(expected);
  });
});
