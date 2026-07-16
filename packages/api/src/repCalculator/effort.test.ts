import { describe, it, expect } from 'vitest';
import { predictWeightForRepsAndEffort, convertEffort, type Effort } from './effort';
import { predictWeightForReps } from './repCalculatorUtils';

const effort = (mode: 'rpe' | 'pct', value: number): Effort => ({ mode, value });

describe('predictWeightForRepsAndEffort', () => {
  it.each([
    ['pct mode: 100% of e1rm', 400, 1, effort('pct', 100), 400],
    ['pct mode: 50% of e1rm', 400, 5, effort('pct', 50), 200],
    ['rpe mode: RPE10 (1RM)', 400, 1, effort('rpe', 10), 400],
    ['rpe mode: 3 reps @ RPE10', 400, 3, effort('rpe', 10), predictWeightForReps(400, 3)],
    [
      'rpe mode: 5 reps @ RPE9',
      300,
      5,
      effort('rpe', 9),
      predictWeightForReps(300, 6), // effectiveReps = 5 + (10 - 9) = 6
    ],
  ])('%s', (_, e1rm, reps, eff, expected) => {
    expect(predictWeightForRepsAndEffort(e1rm, reps, eff)).toBeCloseTo(expected, 2);
  });
});

describe('convertEffort', () => {
  it.each([
    ['rpe to pct: 3 reps @ RPE10 ≈ 91%', 3, effort('rpe', 10), 'pct', 91],
    ['rpe to pct: 1 rep @ RPE10 = 100%', 1, effort('rpe', 10), 'pct', 100],
    ['rpe to pct: 5 reps @ RPE8 ≈ 81%', 5, effort('rpe', 8), 'pct', 81],
    ['pct to rpe: 90.9% from 3 reps ≈ RPE10', 3, effort('pct', 90.909), 'rpe', 10],
    ['pct to rpe: 100% from any reps = RPE10', 3, effort('pct', 100), 'rpe', 10],
    ['pct to rpe: 50% from 5 reps ≈ RPE1', 5, effort('pct', 50), 'rpe', 1],
  ])('%s', (_, reps, eff, toMode, expected) => {
    const result = convertEffort(reps, eff, toMode);
    expect(result).toBeCloseTo(expected, 1);
  });

  it('rounds pct results to the nearest whole percent', () => {
    // Test a case that doesn't round evenly (1 rep @ RPE7.5 -> ~89.55%)
    const result = convertEffort(1, effort('rpe', 7.5), 'pct');
    expect(Number.isInteger(result)).toBe(true);
  });

  it.each([
    ['rpe passthrough', 5, effort('rpe', 8), 'rpe', 8],
    ['pct passthrough', 3, effort('pct', 85), 'pct', 85],
  ])('%s (no-op identity)', (_, reps, eff, toMode, expected) => {
    expect(convertEffort(reps, eff, toMode)).toBe(expected);
  });

  it('rounds rpe results to nearest 0.5', () => {
    // Test a case that doesn't round evenly
    const result = convertEffort(7, effort('pct', 85), 'rpe');
    const fractional = result % 0.5;
    expect(fractional).toBe(0); // result is exact multiple of 0.5
  });

  it('clamps rpe to [1, 10]', () => {
    const veryLight = convertEffort(10, effort('pct', 150), 'rpe'); // extremely light
    expect(veryLight).toBeLessThanOrEqual(10);
    expect(veryLight).toBeGreaterThanOrEqual(1);

    const veryHeavy = convertEffort(1, effort('pct', 40), 'rpe'); // extremely heavy
    expect(veryHeavy).toBeLessThanOrEqual(10);
    expect(veryHeavy).toBeGreaterThanOrEqual(1);
  });
});

describe('convertEffort round-trip', () => {
  it.each([
    ['rpe → pct → rpe: 5 reps @ RPE8', 5, 'rpe', 8],
    ['pct → rpe → pct: 3 reps @ 85%', 3, 'pct', 85],
    ['rpe → pct → rpe: 1 rep @ RPE10', 1, 'rpe', 10],
    ['pct → rpe → pct: 1 rep @ 100%', 1, 'pct', 100],
  ])('%s', (_, reps, mode, value) => {
    const original = effort(mode as 'rpe' | 'pct', value);
    const toOther = mode === 'rpe' ? 'pct' : 'rpe';
    const converted = convertEffort(reps, original, toOther as 'rpe' | 'pct');
    const backAgain = convertEffort(
      reps,
      effort(toOther as 'rpe' | 'pct', converted),
      mode as 'rpe' | 'pct'
    );
    expect(backAgain).toBeCloseTo(value, 0);
  });
});

describe('edge cases', () => {
  it('predictWeightForRepsAndEffort with rpe=10 matches predictWeightForReps', () => {
    const e1rm = 300;
    const reps = 5;
    const rpe10 = effort('rpe', 10);
    expect(predictWeightForRepsAndEffort(e1rm, reps, rpe10)).toBeCloseTo(
      predictWeightForReps(e1rm, reps),
      2
    );
  });

  it('pct=100 with rpe conversion yields rpe≈10', () => {
    const result = convertEffort(5, effort('pct', 100), 'rpe');
    expect(result).toBe(10);
  });

  it('rpe=10 with pct conversion yields pct based on reps', () => {
    const rpe10 = effort('rpe', 10);
    const pct1 = convertEffort(1, rpe10, 'pct');
    const pct5 = convertEffort(5, rpe10, 'pct');
    // rpe=10 means effectiveReps = reps (since 10 - 10 = 0)
    // 1 rep @ effectiveReps 1 → 100%
    // 5 reps @ effectiveReps 5 → 100 / (1 + 5/30) ≈ 85.7%, rounded to nearest whole percent → 86
    expect(pct1).toBe(100);
    expect(pct5).toBe(86);
  });
});
