import { describe, it, expect } from 'vitest';
import { calculateDots, calculateSchwartzMalone, calculateWilksScore } from './metrics';

describe('calculateDots', () => {
  describe('boundary conditions', () => {
    it('returns 0 when bodyweight is below 40 kg', () => {
      expect(calculateDots(39, 500, false, 'kg')).toBe(0);
    });

    it('returns 0 when male bodyweight exceeds 210 kg', () => {
      expect(calculateDots(211, 500, false, 'kg')).toBe(0);
    });

    it('returns 0 when female bodyweight exceeds 150 kg', () => {
      expect(calculateDots(151, 500, true, 'kg')).toBe(0);
    });

    it('returns 0 when total is 0', () => {
      expect(calculateDots(80, 0, false, 'kg')).toBe(0);
    });
  });

  describe('concrete calculations', () => {
    it('computes a known male score', () => {
      expect(calculateDots(80, 500, false, 'kg')).toBeCloseTo(344.76, 1);
    });

    it('computes a known female score', () => {
      expect(calculateDots(60, 300, true, 'kg')).toBeCloseTo(332.57, 1);
    });
  });

  describe('gender differences', () => {
    it('uses different coefficients for each gender', () => {
      const maleScore = calculateDots(80, 500, false, 'kg');
      const femaleScore = calculateDots(80, 500, true, 'kg');
      expect(maleScore).not.toBe(femaleScore);
    });
  });

  describe('scaling and linearity', () => {
    it('scales linearly with total', () => {
      const score1 = calculateDots(80, 500, false, 'kg');
      const score2 = calculateDots(80, 1000, false, 'kg');
      expect(score2).toBeCloseTo(score1 * 2, 1);
    });
  });

  describe('precision and rounding', () => {
    it('rounds result to 2 decimal places', () => {
      const score = calculateDots(75.5, 350.25, false, 'kg');
      const rounded = Math.round(score * 100) / 100;
      expect(score).toBe(rounded);
    });
  });

  describe('unit conversion', () => {
    it('treats lbs as the default unit', () => {
      const score1 = calculateDots(176.37, 1102.31, false);
      const score2 = calculateDots(176.37, 1102.31, false, 'lbs');
      expect(score1).toBe(score2);
    });

    it('converts lbs to kg before applying the formula', () => {
      // 176.37 lbs ≈ 80 kg, 1102.31 lbs ≈ 500 kg
      const scoreLbs = calculateDots(176.37, 1102.31, false, 'lbs');
      const scoreKg = calculateDots(80, 500, false, 'kg');
      expect(scoreLbs).toBeCloseTo(scoreKg, 1);
    });
  });
});

describe('calculateSchwartzMalone', () => {
  describe('boundary conditions', () => {
    it('clamps to first-anchor coefficient when bw is at or below table minimum', () => {
      expect(calculateSchwartzMalone(100, 1000, false)).toBe(1258.0);
    });

    it('clamps to last-anchor coefficient when bw is above table maximum', () => {
      expect(calculateSchwartzMalone(400, 1000, false)).toBe(512.0);
    });

    it('returns 0 when total is 0', () => {
      expect(calculateSchwartzMalone(150, 0, false)).toBe(0);
    });
  });

  describe('interpolation', () => {
    it('interpolates between anchors for an off-table bodyweight', () => {
      expect(calculateSchwartzMalone(150, 1000, false)).toBeCloseTo(914.0588, 2);
    });
  });

  describe('scaling and linearity', () => {
    it('scales linearly with total', () => {
      const score1 = calculateSchwartzMalone(150, 1000, false);
      const score2 = calculateSchwartzMalone(150, 2000, false);
      expect(score2).toBeCloseTo(score1 * 2, 3);
    });
  });

  describe('gender differences', () => {
    it('uses different coefficients for each gender', () => {
      const maleScore = calculateSchwartzMalone(150, 1000, false);
      const femaleScore = calculateSchwartzMalone(150, 1000, true);
      expect(maleScore).not.toBe(femaleScore);
    });
  });

  describe('precision', () => {
    it('returns a value with at most 4 decimal places', () => {
      const score = calculateSchwartzMalone(150, 1000, false);
      const decimalPlaces = (score.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(4);
    });
  });

  describe('unit conversion', () => {
    it('treats lbs as the default unit', () => {
      const score1 = calculateSchwartzMalone(150, 1000, false);
      const score2 = calculateSchwartzMalone(150, 1000, false, 'lbs');
      expect(score1).toBe(score2);
    });

    it('converts kg inputs to lbs before computing', () => {
      // 68.039 kg × 2.20462 ≈ 150 lbs, 453.592 kg × 2.20462 ≈ 1000 lbs
      const scoreKg = calculateSchwartzMalone(68.039, 453.592, false, 'kg');
      const scoreLbs = calculateSchwartzMalone(150, 1000, false, 'lbs');
      expect(scoreKg).toBeCloseTo(scoreLbs, 2);
    });
  });
});

describe('calculateWilksScore', () => {
  describe('concrete calculations', () => {
    it('computes a known male score', () => {
      // 176.37 lbs ≈ 80 kg, 881.85 lbs ≈ 400 kg
      expect(calculateWilksScore(176.37, 881.85, false)).toBeCloseTo(273.1, 1);
    });
  });

  describe('boundary conditions', () => {
    it('returns 0 when total is 0', () => {
      expect(calculateWilksScore(80, 0, false, 'kg')).toBe(0);
    });
  });

  describe('scaling and linearity', () => {
    it('scales linearly with total', () => {
      const score1 = calculateWilksScore(176.37, 881.85, false);
      const score2 = calculateWilksScore(176.37, 1763.7, false);
      expect(score2).toBeCloseTo(score1 * 2, 1);
    });
  });

  describe('gender differences', () => {
    it('uses different coefficients for each gender', () => {
      const maleScore = calculateWilksScore(176.37, 881.85, false);
      const femaleScore = calculateWilksScore(176.37, 881.85, true);
      expect(maleScore).not.toBe(femaleScore);
    });
  });

  describe('precision and rounding', () => {
    it('rounds result to 2 decimal places', () => {
      const score = calculateWilksScore(80.5, 402.3, false, 'kg');
      const rounded = parseFloat(score.toFixed(2));
      expect(score).toBe(rounded);
    });
  });

  describe('unit conversion', () => {
    it('treats lbs as the default unit', () => {
      const score1 = calculateWilksScore(176.37, 881.85, false);
      const score2 = calculateWilksScore(176.37, 881.85, false, 'lbs');
      expect(score1).toBe(score2);
    });

    it('converts lbs to kg before applying the formula', () => {
      const scoreLbs = calculateWilksScore(176.37, 881.85, false, 'lbs');
      const scoreKg = calculateWilksScore(80, 400, false, 'kg');
      expect(scoreLbs).toBeCloseTo(scoreKg, 1);
    });
  });
});
