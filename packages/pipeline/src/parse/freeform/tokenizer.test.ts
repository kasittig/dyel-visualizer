import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer';

describe('tokenizer', () => {
  it('correctly tokenizes all weight, rep, rpe, and operator sequence layout combinations', () => {
    expect(tokenize('315x5 @8')).toMatchObject({ weights: [{ value: 315 }], reps: 5, rpe: 8 });
    expect(tokenize('3x5 @ 315')).toMatchObject({
      weights: [{ value: 315 }],
      reps: 5,
    });
    expect(tokenize('100kg x 5')).toMatchObject({ weights: [{ value: 100, unit: 'kg' }], reps: 5 });
    expect(tokenize('225lbs x 8')).toMatchObject({
      weights: [{ value: 225, unit: 'lbs' }],
      reps: 8,
    });
    expect(tokenize('140.5kg x 5')).toMatchObject({
      weights: [{ value: 140.5, unit: 'kg' }],
      reps: 5,
    });
    expect(tokenize('225x5 @7')).toMatchObject({ weights: [{ value: 225 }], reps: 5, rpe: 7 });
    expect(tokenize('315 x 5 @8')).toMatchObject({ weights: [{ value: 315 }], reps: 5, rpe: 8 });
    expect(tokenize('2x5 @ 405')).toMatchObject({ weights: [{ value: 405 }], reps: 5 });

    expect(tokenize('315/335/355 x3').weights).toEqual([
      { value: 315 },
      { value: 335 },
      { value: 355 },
    ]);
    expect(tokenize('135kg/155kg/175kg x3').weights).toEqual([
      { value: 135, unit: 'kg' },
      { value: 155, unit: 'kg' },
      { value: 175, unit: 'kg' },
    ]);

    expect(() => {
      return tokenize('315');
    }).toThrow();
    expect(() => {
      return tokenize('x5');
    }).toThrow();
  });
});
