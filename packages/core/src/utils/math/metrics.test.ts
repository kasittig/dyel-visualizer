import { describe, it, expect } from 'vitest';
import { calculateMetrics } from './metrics';

describe('calculateMetrics', () => {
  describe('boundary conditions', () => {
    it('returns 0 when bodyweight is below 40 kg', () => {
      expect(calculateMetrics(39, 500, false, 'kg').dots).toBe(0);
    });

    it('returns 0 when male bodyweight exceeds 210 kg', () => {
      expect(calculateMetrics(211, 500, false, 'kg').dots).toBe(0);
    });

    it('returns 0 when female bodyweight exceeds 150 kg', () => {
      expect(calculateMetrics(151, 500, true, 'kg').dots).toBe(0);
    });

    it('returns 0 when total is 0', () => {
      expect(calculateMetrics(80, 0, false, 'kg').dots).toBe(0);
    });
  });

  describe('concrete calculations', () => {
    it('computes a known male score', () => {
      expect(calculateMetrics(80, 500, false, 'kg').dots).toBeCloseTo(344.76, 1);
    });

    it('computes a known female score', () => {
      expect(calculateMetrics(60, 300, true, 'kg').dots).toBeCloseTo(332.57, 1);
    });
  });

  describe('gender differences', () => {
    it('uses different coefficients for each gender', () => {
      const maleScore = calculateMetrics(80, 500, false, 'kg').dots;
      const femaleScore = calculateMetrics(80, 500, true, 'kg').dots;
      expect(maleScore).not.toBe(femaleScore);
    });
  });

  describe('scaling and linearity', () => {
    it('scales linearly with total', () => {
      const score1 = calculateMetrics(80, 500, false, 'kg').dots;
      const score2 = calculateMetrics(80, 1000, false, 'kg').dots;
      expect(score2).toBeCloseTo(score1 * 2, 1);
    });
  });

  describe('precision and rounding', () => {
    it('rounds result to 2 decimal places', () => {
      const score = calculateMetrics(75.5, 350.25, false, 'kg').dots;
      const rounded = Math.round(score * 100) / 100;
      expect(score).toBe(rounded);
    });
  });

  describe('unit conversion', () => {
    it('treats lbs as the default unit', () => {
      const score1 = calculateMetrics(176.37, 1102.31, false).dots;
      const score2 = calculateMetrics(176.37, 1102.31, false, 'lbs').dots;
      expect(score1).toBe(score2);
    });

    it('converts lbs to kg before applying the formula', () => {
      // 176.37 lbs ≈ 80 kg, 1102.31 lbs ≈ 500 kg
      const scoreLbs = calculateMetrics(176.37, 1102.31, false, 'lbs').dots;
      const scoreKg = calculateMetrics(80, 500, false, 'kg').dots;
      expect(scoreLbs).toBeCloseTo(scoreKg, 1);
    });
  });
});

describe('calculateMetrics', () => {
  describe('boundary conditions', () => {
    it('clamps to first-anchor coefficient when bw is at or below table minimum', () => {
      // table min is 90 lbs; 80 lbs clamps to the 90-lb coefficient (1.2803)
      expect(calculateMetrics(80, 1000, false).schwartzmalone).toBe(1280.3);
    });

    it('clamps to last-anchor coefficient when bw is above table maximum', () => {
      // table max is 345 lbs (c=0.4866); 400 lbs clamps there
      expect(calculateMetrics(400, 1000, false).schwartzmalone).toBe(486.6);
    });

    it('returns 0 when total is 0', () => {
      expect(calculateMetrics(150, 0, false).schwartzmalone).toBe(0);
    });
  });

  describe('interpolation', () => {
    it('interpolates between adjacent per-pound entries for a fractional bodyweight', () => {
      // 150.5 lbs interpolates between 150 (c=0.7207) and 151 (c=0.7165) → 0.7186
      expect(calculateMetrics(150.5, 1000, false).schwartzmalone).toBeCloseTo(718.6, 2);
    });
  });

  describe('regression', () => {
    it('returns the correct score for a 205 lb female with a 626 lb total', () => {
      // coefficient at 205 lbs women = 0.6209; 626 × 0.6209 = 388.6834
      expect(calculateMetrics(205, 626, true).schwartzmalone).toBe(388.6834);
    });
  });

  describe('scaling and linearity', () => {
    it('scales linearly with total', () => {
      const score1 = calculateMetrics(150, 1000, false).schwartzmalone;
      const score2 = calculateMetrics(150, 2000, false).schwartzmalone;
      expect(score2).toBeCloseTo(score1 * 2, 3);
    });
  });

  describe('gender differences', () => {
    it('uses different coefficients for each gender', () => {
      const maleScore = calculateMetrics(150, 1000, false).schwartzmalone;
      const femaleScore = calculateMetrics(150, 1000, true).schwartzmalone;
      expect(maleScore).not.toBe(femaleScore);
    });
  });

  describe('precision', () => {
    it('returns a value with at most 4 decimal places', () => {
      const score = calculateMetrics(150, 1000, false).schwartzmalone;
      const decimalPlaces = (score.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(4);
    });
  });

  describe('unit conversion', () => {
    it('treats lbs as the default unit', () => {
      const score1 = calculateMetrics(150, 1000, false).schwartzmalone;
      const score2 = calculateMetrics(150, 1000, false, 'lbs').schwartzmalone;
      expect(score1).toBe(score2);
    });

    it('converts kg inputs to lbs before computing', () => {
      // 68.039 kg × 2.20462 ≈ 150 lbs, 453.592 kg × 2.20462 ≈ 1000 lbs
      const scoreKg = calculateMetrics(68.039, 453.592, false, 'kg').schwartzmalone;
      const scoreLbs = calculateMetrics(150, 1000, false, 'lbs').schwartzmalone;
      expect(scoreKg).toBeCloseTo(scoreLbs, 1);
    });
  });
});

describe('calculateMetrics', () => {
  describe('concrete calculations', () => {
    it('computes a known male score', () => {
      // 176.37 lbs ≈ 80 kg, 881.85 lbs ≈ 400 kg
      expect(calculateMetrics(176.37, 881.85, false).wilks).toBeCloseTo(273.1, 1);
    });
  });

  describe('boundary conditions', () => {
    it('returns 0 when total is 0', () => {
      expect(calculateMetrics(80, 0, false, 'kg').wilks).toBe(0);
    });
  });

  describe('scaling and linearity', () => {
    it('scales linearly with total', () => {
      const score1 = calculateMetrics(176.37, 881.85, false).wilks;
      const score2 = calculateMetrics(176.37, 1763.7, false).wilks;
      expect(score2).toBeCloseTo(score1 * 2, 1);
    });
  });

  describe('gender differences', () => {
    it('uses different coefficients for each gender', () => {
      const maleScore = calculateMetrics(176.37, 881.85, false).wilks;
      const femaleScore = calculateMetrics(176.37, 881.85, true).wilks;
      expect(maleScore).not.toBe(femaleScore);
    });
  });

  describe('precision and rounding', () => {
    it('rounds result to 2 decimal places', () => {
      const score = calculateMetrics(80.5, 402.3, false, 'kg').wilks;
      const rounded = parseFloat(score.toFixed(2));
      expect(score).toBe(rounded);
    });
  });

  describe('unit conversion', () => {
    it('treats lbs as the default unit', () => {
      const score1 = calculateMetrics(176.37, 881.85, false).wilks;
      const score2 = calculateMetrics(176.37, 881.85, false, 'lbs').wilks;
      expect(score1).toBe(score2);
    });

    it('converts lbs to kg before applying the formula', () => {
      const scoreLbs = calculateMetrics(176.37, 881.85, false, 'lbs').wilks;
      const scoreKg = calculateMetrics(80, 400, false, 'kg').wilks;
      expect(scoreLbs).toBeCloseTo(scoreKg, 1);
    });
  });
});

describe('calculateMetrics — percentile calibration', () => {
  // Regression: SM percentile params were set too low, inflating SM percentile
  // relative to Wilks/DOTS for the same lifter.
  it('female 205 lbs / 626 lbs: SM percentile is within 15 points of Wilks percentile', () => {
    const m = calculateMetrics(205, 626, true);
    expect(Math.abs(m.schwartzmalonePercentile - m.wilksPercentile)).toBeLessThanOrEqual(15);
  });

  it('female 205 lbs / 626 lbs: SM percentile is within 15 points of DOTS percentile', () => {
    const m = calculateMetrics(205, 626, true);
    expect(Math.abs(m.schwartzmalonePercentile - m.dotsPercentile)).toBeLessThanOrEqual(15);
  });
});
