import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer';

describe('tokenizer', () => {
  it('parses 315x5 @8 → weight 315, reps 5, rpe 8', () => {
    const result = tokenize('315x5 @8');
    expect(result.weights).toEqual([{ value: 315 }]);
    expect(result.reps).toBe(5);
    expect(result.rpe).toBe(8);
  });

  it('parses 3x5 @ 315 (reversed order) → weight 315, reps 5', () => {
    const result = tokenize('3x5 @ 315');
    expect(result.weights).toEqual([{ value: 315 }]);
    expect(result.reps).toBe(5);
    expect(result.rpe).toBeUndefined();
  });

  it('parses 315/335/355 x3 (multi-weight shorthand) → three weight values, reps 3 each', () => {
    const result = tokenize('315/335/355 x3');
    expect(result.weights).toEqual([{ value: 315 }, { value: 335 }, { value: 355 }]);
    expect(result.reps).toBe(3);
  });

  it('parses unit suffixes on the weight literal, e.g. 100kg x 5', () => {
    const result = tokenize('100kg x 5');
    expect(result.weights).toEqual([{ value: 100, unit: 'kg' }]);
    expect(result.reps).toBe(5);
  });

  it('parses weight with lbs unit', () => {
    const result = tokenize('225lbs x 8');
    expect(result.weights).toEqual([{ value: 225, unit: 'lbs' }]);
    expect(result.reps).toBe(8);
  });

  it('parses decimal weights', () => {
    const result = tokenize('140.5kg x 5');
    expect(result.weights).toEqual([{ value: 140.5, unit: 'kg' }]);
    expect(result.reps).toBe(5);
  });

  it('throws on missing reps', () => {
    expect(() => tokenize('315')).toThrow();
  });

  it('throws on missing weights', () => {
    expect(() => tokenize('x5')).toThrow();
  });

  it('parses multiple weights with units in shorthand', () => {
    const result = tokenize('135kg/155kg/175kg x3');
    expect(result.weights).toEqual([
      { value: 135, unit: 'kg' },
      { value: 155, unit: 'kg' },
      { value: 175, unit: 'kg' },
    ]);
    expect(result.reps).toBe(3);
  });

  it('handles @NUMBER without space for RPE', () => {
    const result = tokenize('225x5 @7');
    expect(result.weights).toEqual([{ value: 225 }]);
    expect(result.reps).toBe(5);
    expect(result.rpe).toBe(7);
  });

  it('handles space-separated x operator', () => {
    const result = tokenize('315 x 5 @8');
    expect(result.weights).toEqual([{ value: 315 }]);
    expect(result.reps).toBe(5);
    expect(result.rpe).toBe(8);
  });

  it('parses reversed order with space-separated @ operator', () => {
    const result = tokenize('2x5 @ 405');
    expect(result.weights).toEqual([{ value: 405 }]);
    expect(result.reps).toBe(5);
  });
});
