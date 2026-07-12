import { describe, it, expect } from 'vitest';
import { wilks, dots } from './athlete';

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
});
