import { describe, it, expect } from 'vitest';
import { wilks, dots, computeStrengthScores } from './athlete';

describe('athlete', () => {
  describe('wilks', () => {
    it('computes a plausible score for a male lifter', () => {
      const score = wilks(500, { sex: 'M', bodyweight: 83, deadliftStance: 'conventional' });
      expect(score).toBeGreaterThan(300);
      expect(score).toBeLessThan(400);
    });

    it('computes a plausible score for a female lifter', () => {
      const score = wilks(300, { sex: 'F', bodyweight: 63, deadliftStance: 'conventional' });
      expect(score).toBeGreaterThan(300);
      expect(score).toBeLessThan(450);
    });

    it('increases with total at fixed bodyweight', () => {
      const ctx = { sex: 'M' as const, bodyweight: 83, deadliftStance: 'conventional' as const };
      expect(wilks(600, ctx)).toBeGreaterThan(wilks(500, ctx));
    });

    it('differs by sex for the same total/bodyweight', () => {
      expect(wilks(400, { sex: 'M', bodyweight: 75, deadliftStance: 'conventional' })).not.toBe(
        wilks(400, { sex: 'F', bodyweight: 75, deadliftStance: 'conventional' })
      );
    });
  });

  describe('dots', () => {
    it('computes a plausible score for a male lifter', () => {
      const score = dots(500, { sex: 'M', bodyweight: 83, deadliftStance: 'conventional' });
      expect(score).toBeGreaterThan(300);
      expect(score).toBeLessThan(400);
    });

    it('computes a plausible score for a female lifter', () => {
      const score = dots(300, { sex: 'F', bodyweight: 63, deadliftStance: 'conventional' });
      expect(score).toBeGreaterThan(300);
      expect(score).toBeLessThan(450);
    });

    it('increases with total at fixed bodyweight', () => {
      const ctx = { sex: 'F' as const, bodyweight: 63, deadliftStance: 'conventional' as const };
      expect(dots(350, ctx)).toBeGreaterThan(dots(300, ctx));
    });

    it('returns 0 outside the male bodyweight bounds', () => {
      expect(dots(500, { sex: 'M', bodyweight: 30, deadliftStance: 'conventional' })).toBe(0);
      expect(dots(500, { sex: 'M', bodyweight: 250, deadliftStance: 'conventional' })).toBe(0);
    });

    it('returns 0 outside the female bodyweight bounds', () => {
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
    ])('produces complete metrics for %s', (_, isFemale, bw, total, unit) => {
      const metrics = computeStrengthScores(bw, total, isFemale, unit as 'lbs' | 'kg');
      expect(metrics).toHaveProperty('wilks');
      expect(metrics).toHaveProperty('wilksPercentile');
      expect(metrics).toHaveProperty('dots');
      expect(metrics).toHaveProperty('dotsPercentile');
      expect(metrics).toHaveProperty('schwartzmalone');
      expect(metrics).toHaveProperty('schwartzmalonePercentile');
      expect(typeof metrics.wilks).toBe('number');
      expect(typeof metrics.wilksPercentile).toBe('number');
      expect(typeof metrics.dots).toBe('number');
      expect(typeof metrics.dotsPercentile).toBe('number');
      expect(typeof metrics.schwartzmalone).toBe('number');
      expect(typeof metrics.schwartzmalonePercentile).toBe('number');
    });

    it.each([
      ['wilks', (m) => m.wilks],
      ['dots', (m) => m.dots],
      ['schwartzmalone', (m) => m.schwartzmalone],
    ])('increases score with higher total (%s)', (_, accessor) => {
      const lower = computeStrengthScores(82, 450, false, 'kg');
      const higher = computeStrengthScores(82, 500, false, 'kg');
      expect(accessor(higher)).toBeGreaterThan(accessor(lower));
    });

    it('handles unit conversion (lbs to kg equivalent)', () => {
      const lbs = computeStrengthScores(180, 1100, false, 'lbs');
      const kg = computeStrengthScores(180 * 0.45359237, 1100 * 0.45359237, false, 'kg');
      expect(Math.abs(lbs.wilks - kg.wilks)).toBeLessThan(0.1);
      expect(Math.abs(lbs.dots - kg.dots)).toBeLessThan(0.1);
      expect(Math.abs(lbs.schwartzmalone - kg.schwartzmalone)).toBeLessThan(0.01);
    });

    it('returns percentiles in plausible range (1-99)', () => {
      const metrics = computeStrengthScores(82, 500, false, 'kg');
      expect(metrics.wilksPercentile).toBeGreaterThanOrEqual(1);
      expect(metrics.wilksPercentile).toBeLessThanOrEqual(99);
      expect(metrics.dotsPercentile).toBeGreaterThanOrEqual(1);
      expect(metrics.dotsPercentile).toBeLessThanOrEqual(99);
      expect(metrics.schwartzmalonePercentile).toBeGreaterThanOrEqual(1);
      expect(metrics.schwartzmalonePercentile).toBeLessThanOrEqual(99);
    });

    it('produces different scores for male vs female at same bodyweight/total', () => {
      const male = computeStrengthScores(82, 500, false, 'kg');
      const female = computeStrengthScores(82, 500, true, 'kg');
      expect(male.wilks).not.toBe(female.wilks);
      expect(male.dots).not.toBe(female.dots);
      expect(male.schwartzmalone).not.toBe(female.schwartzmalone);
    });
  });
});
