import { describe, it, expect } from 'vitest';
import { wilks, dots } from './athlete';

describe('athlete', () => {
  describe('wilks', () => {
    it('computes a plausible score for a male lifter', () => {
      const score = wilks(500, { sex: 'M', bodyweight: 83 });
      expect(score).toBeGreaterThan(300);
      expect(score).toBeLessThan(400);
    });

    it('computes a plausible score for a female lifter', () => {
      const score = wilks(300, { sex: 'F', bodyweight: 63 });
      expect(score).toBeGreaterThan(300);
      expect(score).toBeLessThan(450);
    });

    it('increases with total at fixed bodyweight', () => {
      const ctx = { sex: 'M' as const, bodyweight: 83 };
      expect(wilks(600, ctx)).toBeGreaterThan(wilks(500, ctx));
    });

    it('differs by sex for the same total/bodyweight', () => {
      expect(wilks(400, { sex: 'M', bodyweight: 75 })).not.toBe(
        wilks(400, { sex: 'F', bodyweight: 75 })
      );
    });
  });

  describe('dots', () => {
    it('computes a plausible score for a male lifter', () => {
      const score = dots(500, { sex: 'M', bodyweight: 83 });
      expect(score).toBeGreaterThan(300);
      expect(score).toBeLessThan(400);
    });

    it('computes a plausible score for a female lifter', () => {
      const score = dots(300, { sex: 'F', bodyweight: 63 });
      expect(score).toBeGreaterThan(300);
      expect(score).toBeLessThan(450);
    });

    it('increases with total at fixed bodyweight', () => {
      const ctx = { sex: 'F' as const, bodyweight: 63 };
      expect(dots(350, ctx)).toBeGreaterThan(dots(300, ctx));
    });

    it('returns 0 outside the male bodyweight bounds', () => {
      expect(dots(500, { sex: 'M', bodyweight: 30 })).toBe(0);
      expect(dots(500, { sex: 'M', bodyweight: 250 })).toBe(0);
    });

    it('returns 0 outside the female bodyweight bounds', () => {
      expect(dots(300, { sex: 'F', bodyweight: 30 })).toBe(0);
      expect(dots(300, { sex: 'F', bodyweight: 200 })).toBe(0);
    });
  });
});
