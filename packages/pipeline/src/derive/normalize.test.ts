import { describe, it, expect } from 'vitest';
import { fitNormalizationModel, normalizeE1rm, projectToVariant } from './normalize';
import type { TaggedSetRecord } from '../tag/tag';

const day = (n: number) => Date.UTC(2024, 0, n);

const rec = (
  date: number,
  canonical: string,
  weight: number,
  reps: number,
  tags: string[]
): TaggedSetRecord => ({
  date,
  exercise: canonical,
  weight,
  reps,
  canonical,
  tags: new Set(tags),
});

const benchHistory: TaggedSetRecord[] = [
  rec(day(1), 'bench', 100, 1, ['lift:bench', 'comp-lift']),
  rec(day(10), 'bench', 110, 1, ['lift:bench', 'comp-lift']),
  rec(day(1), 'bench-chains', 80, 1, ['lift:bench', 'addl:chains', 'variation']),
  rec(day(10), 'bench-chains', 90, 1, ['lift:bench', 'addl:chains', 'variation']),
];

const squatHistory: TaggedSetRecord[] = [
  rec(day(1), 'squat', 200, 1, ['lift:squat', 'comp-lift']),
  rec(day(10), 'squat', 220, 1, ['lift:squat', 'comp-lift']),
  rec(day(1), 'squat-chains', 150, 1, ['lift:squat', 'addl:chains', 'variation']),
  rec(day(10), 'squat-chains', 160, 1, ['lift:squat', 'addl:chains', 'variation']),
];

const history = [...benchHistory, ...squatHistory];

describe('fitNormalizationModel', () => {
  it('picks exactly one baseline canonical per lift:* family (prefers comp-lift tag)', () => {
    const model = fitNormalizationModel(history, { minSamples: 1 });
    expect(model.baseline['lift:bench']).toBe('bench');
    expect(model.baseline['lift:squat']).toBe('squat');
  });

  it('falls back to most-sampled canonical when no comp-lift tag exists in the family', () => {
    const noCompLiftHistory: TaggedSetRecord[] = [
      rec(day(1), 'ohp-a', 50, 5, ['lift:ohp']),
      rec(day(3), 'ohp-a', 52, 5, ['lift:ohp']),
      rec(day(5), 'ohp-a', 54, 5, ['lift:ohp']),
      rec(day(1), 'ohp-b', 40, 5, ['lift:ohp']),
    ];
    const model = fitNormalizationModel(noCompLiftHistory, { minSamples: 1 });
    expect(model.baseline['lift:ohp']).toBe('ohp-a');
  });

  it('omits variantFactor entries below minSamples', () => {
    const model = fitNormalizationModel(history, { minSamples: 3 });
    expect(model.variantFactor['bench-chains']).toBeUndefined();
  });

  it('includes variantFactor entries at/above minSamples, carrying n', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 });
    expect(model.variantFactor['bench-chains']).toEqual({ factor: expect.any(Number), n: 2 });
    expect(model.variantFactor['bench-chains'].factor).toBeCloseTo(0.809090909, 5);
  });

  it('fits addlWtOffset per-canonical, not pooled across families sharing the same addl tag', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 });
    expect(model.addlWtOffset['bench-chains']).toEqual({ offsetKg: 20, n: 2 });
    expect(model.addlWtOffset['squat-chains']).toEqual({ offsetKg: 55, n: 2 });
  });

  it('produces a plain-JSON-serializable model (JSON.stringify/parse round-trip)', () => {
    const model = fitNormalizationModel(history, { minSamples: 1 });
    const roundTripped = JSON.parse(JSON.stringify(model));
    expect(roundTripped).toEqual(model);
  });
});

describe('normalizeE1rm', () => {
  it('returns input unchanged for the baseline canonical itself (identity, no lookup)', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 });
    expect(normalizeE1rm('bench', 123.4, model)).toBe(123.4);
  });

  it('returns e1rmKg / factor for a fitted variant', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 });
    const factor = model.variantFactor['bench-chains'].factor;
    expect(normalizeE1rm('bench-chains', 100, model)).toBeCloseTo(100 / factor, 6);
  });

  it('returns null when the canonical has no fitted entry', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 });
    expect(normalizeE1rm('bench-bands', 100, model)).toBeNull();
  });
});

describe('projectToVariant', () => {
  it('returns baselineE1rmKg unchanged when targeting the baseline canonical', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 });
    expect(projectToVariant(150, 'bench', model)).toBe(150);
  });

  it('returns baselineE1rmKg * factor for a fitted variant', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 });
    const factor = model.variantFactor['bench-chains'].factor;
    expect(projectToVariant(150, 'bench-chains', model)).toBeCloseTo(150 * factor, 6);
  });

  it('returns null when the target canonical has no fitted entry', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 });
    expect(projectToVariant(150, 'bench-bands', model)).toBeNull();
  });
});

describe('round-trip', () => {
  it('normalizeE1rm then projectToVariant returns the original value within floating point tolerance', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 });
    const normalized = normalizeE1rm('bench-chains', 150, model)!;
    const projected = projectToVariant(normalized, 'bench-chains', model)!;
    expect(projected).toBeCloseTo(150, 6);
  });
});
