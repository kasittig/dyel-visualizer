import { describe, it, expect } from 'vitest';
import { predictWeightForRepsAndEffort, convertEffort, type Effort } from './effort';
import { predictWeightForReps } from './repCalculatorUtils';

const effort = (mode: 'rpe' | 'pct', value: number): Effort => ({ mode, value });

describe('predictWeightForRepsAndEffort', () => {
  const e1rm = 300;

  it.each([
    ['RPE 10 (max effort, 5 reps)', 5, effort('rpe', 10), predictWeightForReps(300, 5)],
    ['RPE 8 (2 RIR, 5 reps)', 5, effort('rpe', 8), predictWeightForReps(300, 7)],
    ['RPE 6 (4 RIR, 5 reps)', 5, effort('rpe', 6), predictWeightForReps(300, 9)],
    ['RPE 10 at 1 rep (1RM)', 1, effort('rpe', 10), predictWeightForReps(300, 1)],
    ['RPE 9 at 1 rep (2 RIR at 1 rep)', 1, effort('rpe', 9), predictWeightForReps(300, 2)],
    ['100% (full 1RM)', 1, effort('pct', 100), 300],
    ['90% (3 reps)', 3, effort('pct', 90), 270],
    ['80% (5 reps)', 5, effort('pct', 80), 240],
    ['50% (20 reps)', 20, effort('pct', 50), 150],
  ])('predictWeightForRepsAndEffort %s equals expected weight', (_, reps, eff, expected) => {
    expect(predictWeightForRepsAndEffort(e1rm, reps, eff)).toBeCloseTo(expected, 1);
  });
});

describe('convertEffort: identity passthrough', () => {
  const reps = 5;

  it.each([
    ['RPE → RPE (same value)', effort('rpe', 8), 'rpe', 8],
    ['RPE 10 → RPE (identity)', effort('rpe', 10), 'rpe', 10],
    ['RPE 1 → RPE (min)', effort('rpe', 1), 'rpe', 1],
    ['% → % (same value)', effort('pct', 85), 'pct', 85],
    ['% 100 → % (identity)', effort('pct', 100), 'pct', 100],
  ])('%s', (_, eff, toMode, expected) => {
    expect(convertEffort(reps, eff, toMode)).toBe(expected);
  });
});

describe('convertEffort: RPE to %', () => {
  it.each([
    ['3 reps @ RPE10 = 91%', 3, effort('rpe', 10), 'pct', 91],
    ['5 reps @ RPE10 = 86%', 5, effort('rpe', 10), 'pct', 86],
    ['1 rep @ RPE10 = 100%', 1, effort('rpe', 10), 'pct', 100],
    ['5 reps @ RPE8 = 81%', 5, effort('rpe', 8), 'pct', 81],
    ['10 reps @ RPE6 = 68%', 10, effort('rpe', 6), 'pct', 68],
  ])('%s', (_, reps, eff, toMode, expected) => {
    expect(convertEffort(reps, eff, toMode)).toBe(expected);
  });
});

describe('convertEffort: % to RPE', () => {
  it.each([
    ['3 reps @ 91% ≈ RPE10', 3, effort('pct', 91), 'rpe', 10],
    ['5 reps @ 86% ≈ RPE10', 5, effort('pct', 86), 'rpe', 10],
    ['1 rep @ 100% = RPE10', 1, effort('pct', 100), 'rpe', 10],
    ['5 reps @ 81% ≈ RPE8', 5, effort('pct', 81), 'rpe', 8],
    ['10 reps @ 68% ≈ RPE6', 10, effort('pct', 68), 'rpe', 6],
  ])('%s', (_, reps, eff, toMode, expected) => {
    const result = convertEffort(reps, eff, toMode);
    expect(result).toBeCloseTo(expected, 0.6);
  });
});

describe('convertEffort: round-trip conversions', () => {
  it.each([
    ['RPE 10 → % → RPE (5 reps)', 5, effort('rpe', 10)],
    ['RPE 8 → % → RPE (5 reps)', 5, effort('rpe', 8)],
    ['RPE 6.5 → % → RPE (8 reps)', 8, effort('rpe', 6.5)],
    ['RPE 9 → % → RPE (3 reps)', 3, effort('rpe', 9)],
    ['% 90 → RPE → % (3 reps)', 3, effort('pct', 90)],
    ['% 80 → RPE → % (5 reps)', 5, effort('pct', 80)],
    ['% 70 → RPE → % (10 reps)', 10, effort('pct', 70)],
  ])('round-trip %s should return close to original', (_, reps, startEffort) => {
    const intermediateMode: 'rpe' | 'pct' = startEffort.mode === 'rpe' ? 'pct' : 'rpe';
    const intermediate = convertEffort(reps, startEffort, intermediateMode);
    const roundTrip = convertEffort(
      reps,
      { mode: intermediateMode, value: intermediate },
      startEffort.mode
    );
    expect(roundTrip).toBeCloseTo(startEffort.value, 0);
  });
});

describe('convertEffort: rounding/clamping edge cases', () => {
  it.each([
    ['RPE identity passthrough (> 10)', 5, effort('rpe', 12), 'rpe', 12],
    ['RPE identity passthrough (< 1)', 5, effort('rpe', 0.5), 'rpe', 0.5],
    ['RPE 10 identity passthrough', 5, effort('rpe', 10), 'rpe', 10],
    ['% 100 converts to RPE 10', 5, effort('pct', 100), 'rpe', 10],
    ['% rounds to nearest whole percent', 5, effort('rpe', 8), 'pct', 81],
    ['RPE converts and rounds to nearest 0.5', 10, effort('pct', 68), 'rpe', 6],
  ])('%s', (_, reps, eff, toMode, expected) => {
    const result = convertEffort(reps, eff, toMode);
    expect(result).toBe(expected);
  });
});

describe('convertEffort: edge case behaviors', () => {
  it('RPE 10 at any reps converts to 100% at 1 rep', () => {
    for (const reps of [1, 3, 5, 8, 10]) {
      const pct = convertEffort(reps, effort('rpe', 10), 'pct');
      if (reps === 1) {
        expect(pct).toBe(100);
      } else {
        expect(pct).toBeLessThan(100);
      }
    }
  });

  it('% 100 always converts to RPE 10', () => {
    for (const reps of [1, 3, 5, 8, 10]) {
      const rpe = convertEffort(reps, effort('pct', 100), 'rpe');
      expect(rpe).toBe(10);
    }
  });

  it('RPE values are clamped [1, 10] after conversion', () => {
    const testCases = [
      [1, effort('pct', 120), 'rpe'], // > 100% should clamp to RPE 10
      [10, effort('pct', 10), 'rpe'], // very low % should clamp to RPE 1
    ];
    for (const [reps, eff, toMode] of testCases) {
      const result = convertEffort(reps as number, eff as Effort, toMode as 'rpe');
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  it('RPE values round to nearest 0.5', () => {
    const pcts = [50, 60, 70, 80, 90];
    for (const pct of pcts) {
      const rpe = convertEffort(5, effort('pct', pct), 'rpe');
      const remainder = (rpe * 2) % 1;
      expect(remainder).toBe(0); // rpe * 2 should be an integer
    }
  });

  it('% values round to nearest whole number', () => {
    const rpes = [1, 2.5, 5, 7.5, 10];
    for (const rpe of rpes) {
      const pct = convertEffort(5, effort('rpe', rpe), 'pct');
      expect(Number.isInteger(pct)).toBe(true);
    }
  });
});
