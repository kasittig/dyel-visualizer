import { describe, it, expect } from 'vitest';
import { wilks, dots, computeStrengthScores } from './athlete';

describe('athlete', () => {
  const ctxM = { sex: 'M' as const, bodyweight: 83, deadliftStance: 'conventional' as const };
  const ctxF = { sex: 'F' as const, bodyweight: 63, deadliftStance: 'conventional' as const };

  describe('wilks', () => {
    it('calculates plausible scores, variations, and sexual dimorphism mappings', () => {
      const sM = wilks(500, ctxM),
        sF = wilks(300, ctxF);
      expect(sM).toBeGreaterThan(300);
      expect(sM).toBeLessThan(400);
      expect(sF).toBeGreaterThan(300);
      expect(sF).toBeLessThan(450);
      expect(wilks(600, ctxM)).toBeGreaterThan(wilks(500, ctxM));
      expect(wilks(400, { sex: 'M', bodyweight: 75, deadliftStance: 'conventional' })).not.toBe(
        wilks(400, { sex: 'F', bodyweight: 75, deadliftStance: 'conventional' })
      );
    });
  });

  describe('dots', () => {
    it('calculates plausible scores, variations, and bounds checks', () => {
      const sM = dots(500, ctxM),
        sF = dots(300, ctxF);
      expect(sM).toBeGreaterThan(300);
      expect(sM).toBeLessThan(400);
      expect(sF).toBeGreaterThan(300);
      expect(sF).toBeLessThan(450);
      expect(dots(350, ctxF)).toBeGreaterThan(dots(300, ctxF));

      expect(dots(500, { sex: 'M', bodyweight: 30, deadliftStance: 'conventional' })).toBe(0);
      expect(dots(500, { sex: 'M', bodyweight: 250, deadliftStance: 'conventional' })).toBe(0);
      expect(dots(300, { sex: 'F', bodyweight: 30, deadliftStance: 'conventional' })).toBe(0);
      expect(dots(300, { sex: 'F', bodyweight: 200, deadliftStance: 'conventional' })).toBe(0);
    });
  });

  describe('computeStrengthScores', () => {
    it.each([
      ['male lbs', false, 180, 1100, 'lbs'],
      ['male kg', false, 82, 500, 'kg'],
      ['female lbs', true, 130, 700, 'lbs'],
      ['female kg', true, 59, 318, 'kg'],
    ])('produces complete numerical metrics for %s', (_, isFemale, bw, total, unit) => {
      expect(computeStrengthScores(bw, total, isFemale, unit as 'lbs' | 'kg')).toMatchObject({
        wilks: expect.any(Number),
        wilksPercentile: expect.any(Number),
        dots: expect.any(Number),
        dotsPercentile: expect.any(Number),
        schwartzmalone: expect.any(Number),
        schwartzmalonePercentile: expect.any(Number),
      });
    });

    it('validates scaling, conversions, boundaries, and metric variation rules', () => {
      const low = computeStrengthScores(82, 450, false, 'kg'),
        high = computeStrengthScores(82, 500, false, 'kg');
      expect(high.wilks).toBeGreaterThan(low.wilks);
      expect(high.dots).toBeGreaterThan(low.dots);
      expect(high.schwartzmalone).toBeGreaterThan(low.schwartzmalone);

      const lbs = computeStrengthScores(180, 1100, false, 'lbs'),
        kg = computeStrengthScores(180 * 0.45359237, 1100 * 0.45359237, false, 'kg');
      expect(Math.abs(lbs.wilks - kg.wilks)).toBeLessThan(0.1);
      expect(Math.abs(lbs.dots - kg.dots)).toBeLessThan(0.1);
      expect(Math.abs(lbs.schwartzmalone - kg.schwartzmalone)).toBeLessThan(0.01);

      [high.wilksPercentile, high.dotsPercentile, high.schwartzmalonePercentile].forEach((p) => {
        expect(p).toBeGreaterThanOrEqual(1);
        expect(p).toBeLessThanOrEqual(99);
      });

      const female = computeStrengthScores(82, 500, true, 'kg');
      expect(high.wilks).not.toBe(female.wilks);
      expect(high.dots).not.toBe(female.dots);
      expect(high.schwartzmalone).not.toBe(female.schwartzmalone);
    });
  });
});
