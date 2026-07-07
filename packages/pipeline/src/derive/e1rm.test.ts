import { describe, it, expect } from 'vitest';
import { calcE1RM } from './e1rm';

describe('calcE1RM', () => {
  it('returns weight for single rep (reps === 1)', () => {
    expect(calcE1RM(100, 1)).toBe(100);
  });

  it('calculates e1rm using Epley formula for multiple reps', () => {
    const expected = 100 * (1 + 5 / 30);
    expect(calcE1RM(100, 5)).toBeCloseTo(expected);
  });

  it.each([
    ['ignores a null/omitted rpe (plain Epley)', 100, 5, undefined, 100 * (1 + 5 / 30)],
    ['shifts effective reps toward failure for a sub-10 rpe', 100, 3, 9, 100 * (1 + (3 + 1) / 30)],
    ['is a no-op at rpe 10 (already a true max)', 100, 3, 10, 100 * (1 + 3 / 30)],
    ['collapses to raw weight when effective reps are exactly 1', 100, 1, 10, 100],
  ])('%s', (_, weight, reps, rpe, expected) => {
    expect(calcE1RM(weight, reps, rpe)).toBeCloseTo(expected);
  });
});
