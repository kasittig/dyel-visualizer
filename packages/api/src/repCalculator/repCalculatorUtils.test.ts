import { describe, it, expect } from 'vitest';
import type { Point, NormalizationModel } from '@dyel/pipeline';
import {
  selectBestE1RMPoint,
  findBestE1RMFromPipeline,
  resolveE1RMEstimate,
  roundTo5,
  predictRepsForWeight,
  predictWeightForReps,
} from './repCalculatorUtils';

const pt = (series: string, v: number, t: number): Point => ({ series, v, t, tags: new Set() });
const mockModel = (overrides?: Partial<NormalizationModel>): NormalizationModel => ({
  baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench', 'lift:deadlift': 'deadlift' },
  variantFactor: {},
  addlWtOffset: {},
  fittedAt: 0,
  ...overrides,
});

describe('selectBestE1RMPoint', () => {
  it.each([
    ['empty array', [], null],
    ['single point', [pt('squat', 300, 1000)], { e1rm: 300, t: 1000 }],
    [
      'picks max',
      [pt('squat', 250, 1000), pt('squat', 300, 2000), pt('squat', 280, 3000)],
      { e1rm: 300, t: 2000 },
    ],
  ])('%s', (_, points, expected) => {
    expect(selectBestE1RMPoint(points)).toEqual(expected);
  });
});

describe('findBestE1RMFromPipeline & resolveE1RMEstimate', () => {
  const today = new Date('2024-01-15');
  const pts = [pt('squat', 250, 1e9), pt('squat', 280, 1e12)];
  const vfModel = mockModel({ variantFactor: { 'squat-pause': { factor: 0.85, n: 10 } } });

  it.each([
    [
      'missing baseline name',
      () => findBestE1RMFromPipeline('squat', 'squat', pts, today, mockModel(), ''),
      null,
    ],
    [
      'exact match same canonical',
      () => findBestE1RMFromPipeline('squat', 'squat', pts, today, mockModel(), 'Comp Squat'),
      expect.objectContaining({ method: 'exact', sourceName: 'Comp Squat' }),
    ],
    [
      'projection variant factor',
      () => findBestE1RMFromPipeline('squat-pause', 'squat', pts, today, vfModel, 'Squat'),
      expect.objectContaining({ method: 'variantFactor', sourceName: 'Squat' }),
    ],
    [
      'missing factor',
      () => findBestE1RMFromPipeline('squat-unknown', 'squat', pts, today, mockModel(), 'Squat'),
      null,
    ],
    [
      'zero scalar drops',
      () =>
        findBestE1RMFromPipeline(
          'squat-bad',
          'squat',
          pts,
          today,
          mockModel({ variantFactor: { 'squat-bad': { factor: 0, n: 5 } } }),
          'Squat'
        ),
      null,
    ],
    [
      'empty history sets',
      () => findBestE1RMFromPipeline('squat', 'squat', [], today, mockModel(), 'Squat'),
      null,
    ],
    [
      'resolve: empty model keys',
      () =>
        resolveE1RMEstimate({
          liftType: 'squat',
          targetCanonical: 'squat',
          baselineName: 'Comp Squat',
          today,
          model: mockModel({ baseline: {} }),
          e1rmPoints: pts,
        }),
      null,
    ],
    [
      'resolve: point mismatch fallback',
      () =>
        resolveE1RMEstimate({
          liftType: 'squat',
          targetCanonical: 'squat',
          baselineName: 'Comp Squat',
          today,
          model: mockModel(),
          e1rmPoints: [pt('bench', 200, 1e9)],
        }),
      null,
    ],
    [
      'resolve: matches explicit label',
      () =>
        resolveE1RMEstimate({
          liftType: 'squat',
          targetCanonical: 'squat',
          baselineName: 'My Squat',
          today,
          model: mockModel(),
          e1rmPoints: pts,
        }),
      expect.objectContaining({ sourceName: 'My Squat', method: 'exact' }),
    ],
    [
      'resolve: fallback canonical label',
      () =>
        resolveE1RMEstimate({
          liftType: 'squat',
          targetCanonical: 'squat',
          baselineName: null,
          today,
          model: mockModel(),
          e1rmPoints: pts,
        }),
      expect.objectContaining({ sourceName: 'squat', method: 'exact' }),
    ],
    [
      'resolve: scales factor cascades',
      () =>
        resolveE1RMEstimate({
          liftType: 'squat',
          targetCanonical: 'squat-pause',
          baselineName: 'Squat',
          today,
          model: vfModel,
          e1rmPoints: pts,
        }),
      expect.objectContaining({ method: 'variantFactor' }),
    ],
    [
      'daysForward: several days prior',
      () => {
        const fiveDaysAgo = new Date(today.getTime() - 5 * 86_400_000);
        return findBestE1RMFromPipeline(
          'squat',
          'squat',
          [pt('squat', 250, fiveDaysAgo.getTime())],
          today,
          mockModel(),
          'Comp Squat'
        );
      },
      expect.objectContaining({ daysForward: 5, method: 'exact' }),
    ],
    [
      'daysForward: same day as data point',
      () =>
        findBestE1RMFromPipeline(
          'squat',
          'squat',
          [pt('squat', 250, today.getTime())],
          today,
          mockModel(),
          'Comp Squat'
        ),
      expect.objectContaining({ daysForward: 0, method: 'exact' }),
    ],
  ])('%s', (_, runner, expected) => {
    const res = runner();
    if (expected === null) {
      expect(res).toBeNull();
    } else {
      expect(res).toEqual(expected);
    }
  });
});

describe('roundTo5', () => {
  it.each([
    [100, 100],
    [22, 20],
    [23, 25],
    [27, 25],
    [28, 30],
    [-22, -20],
    [-23, -25],
    [22.4, 20],
    [22.6, 25],
  ])('rounds %s to %s', (input, expected) => {
    expect(roundTo5(input)).toBe(expected);
  });
});

describe('predictRepsForWeight', () => {
  it.each([
    ['weight <= 0', 300, 0, 1],
    ['weight <= 0 (negative)', 300, -50, 1],
    ['weight >= e1rm', 300, 300, 1],
    ['weight > e1rm', 300, 350, 1],
    ['typical case (e1rm=300, weight=225)', 300, 225, 9],
    ['low weight (e1rm=300, weight=100)', 300, 100, 60],
    ['near e1rm (e1rm=300, weight=290)', 300, 290, 1],
  ])('%s', (_, e1rm, weight, expected) => {
    expect(predictRepsForWeight(e1rm, weight)).toBe(expected);
  });

  it('returns integer result for in-domain weight', () => {
    const result = predictRepsForWeight(300, 225);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('monotonically decreases as weight increases', () => {
    const e1rm = 400;
    const weights = [50, 100, 150, 200, 250, 300, 350];
    const reps = weights.map((w) => predictRepsForWeight(e1rm, w));
    for (let i = 0; i < reps.length - 1; i++) {
      expect(reps[i]).toBeGreaterThanOrEqual(reps[i + 1]);
    }
  });
});

describe('predictWeightForReps', () => {
  it.each([
    ['reps <= 0', 300, 0, 0],
    ['reps <= 0 (negative)', 300, -5, 0],
    ['single rep (1RM)', 300, 1, 300],
    ['typical case (e1rm=300, reps=5)', 300, 5, expect.any(Number)],
  ])('%s', (_, e1rm, reps, expected) => {
    expect(predictWeightForReps(e1rm, reps)).toEqual(expected);
  });
});
