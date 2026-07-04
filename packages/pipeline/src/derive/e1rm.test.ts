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
});
