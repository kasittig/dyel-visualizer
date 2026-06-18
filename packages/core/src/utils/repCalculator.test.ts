import { describe, it, expect } from 'vitest';
import { normalizeToBaseE1RM } from './repCalculator';
import { calcE1RM } from './e1rm';
import type { ConjugateExercise } from '../types/conjugate';
import type { RepCalcStats } from './repCalculator';

const competitionSquat: ConjugateExercise = {
  type: 'squat',
  bar: 'standard',
  stance: 'competition',
  addlWts: [],
  equipment: null,
  displayName: 'Competition Squat',
};

const chainSquat: ConjugateExercise = {
  type: 'squat',
  bar: 'standard',
  stance: 'competition',
  addlWts: ['chains'],
  equipment: null,
  displayName: 'Competition Squat + Chains',
};

const ssbSquat: ConjugateExercise = {
  type: 'squat',
  bar: 'ssb',
  stance: 'competition',
  addlWts: [],
  equipment: null,
  displayName: 'SSB Squat',
};

const ssbChainSquat: ConjugateExercise = {
  type: 'squat',
  bar: 'ssb',
  stance: 'competition',
  addlWts: ['chains'],
  equipment: null,
  displayName: 'SSB Squat + Chains',
};

const wideSquat: ConjugateExercise = {
  type: 'squat',
  bar: 'standard',
  stance: 'wide',
  addlWts: [],
  equipment: null,
  displayName: 'Wide Squat',
};

const emptyStats: RepCalcStats = {
  addlWtOffset: new Map(),
  variantFactor: new Map(),
};

// offset = straight_weight - chain_weight (negative when chains add "extra" weight)
const statsWithOffset: RepCalcStats = {
  addlWtOffset: new Map([['Competition Squat + Chains', { offset: -20, sampleCount: 3 }]]),
  variantFactor: new Map(),
};

const statsWithFactor: RepCalcStats = {
  addlWtOffset: new Map(),
  variantFactor: new Map([
    ['SSB Squat', { factor: 0.9, sampleCount: 5, label: 'SSB', baselineName: 'Competition Squat' }],
    [
      'Wide Squat',
      { factor: 1.05, sampleCount: 5, label: 'Wide', baselineName: 'Competition Squat' },
    ],
  ]),
};

describe('normalizeToBaseE1RM', () => {
  describe('exact match', () => {
    it('returns calcE1RM when source and target are the same exercise', () => {
      const result = normalizeToBaseE1RM(315, 3, competitionSquat, competitionSquat, emptyStats);
      expect(result).toBeCloseTo(calcE1RM(315, 3));
    });

    it('works for a single rep', () => {
      const result = normalizeToBaseE1RM(405, 1, competitionSquat, competitionSquat, emptyStats);
      expect(result).toBe(405);
    });
  });

  describe('same family, addlWt normalization', () => {
    it('strips chain offset when source has chains and target does not', () => {
      // offset = -20: chain bar weight contributes 20 lbs less than straight
      // effective straight weight = 315 + (-20) = 295
      const result = normalizeToBaseE1RM(315, 3, chainSquat, competitionSquat, statsWithOffset);
      expect(result).toBeCloseTo(calcE1RM(295, 3));
    });

    it('applies chain offset when source is straight and target has chains', () => {
      // chain equivalent of 315 straight = 315 - (-20) = 335
      const result = normalizeToBaseE1RM(315, 3, competitionSquat, chainSquat, statsWithOffset);
      expect(result).toBeCloseTo(calcE1RM(335, 3));
    });

    it('returns null when the offset has no samples', () => {
      const stats: RepCalcStats = {
        addlWtOffset: new Map([['Competition Squat + Chains', { offset: -20, sampleCount: 0 }]]),
        variantFactor: new Map(),
      };
      expect(normalizeToBaseE1RM(315, 3, chainSquat, competitionSquat, stats)).toBeNull();
    });

    it('returns null when no offset entry exists for the addlWt exercise', () => {
      expect(normalizeToBaseE1RM(315, 3, chainSquat, competitionSquat, emptyStats)).toBeNull();
    });

    it('clamps to zero when applying offset would go negative', () => {
      const stats: RepCalcStats = {
        addlWtOffset: new Map([['Competition Squat + Chains', { offset: 400, sampleCount: 1 }]]),
        variantFactor: new Map(),
      };
      // source=straight, target=chains: max(0, 100 - 400) = 0
      const result = normalizeToBaseE1RM(100, 3, competitionSquat, chainSquat, stats);
      expect(result).toBeCloseTo(calcE1RM(0, 3));
    });
  });

  describe('cross-family, variant factor normalization', () => {
    it('normalizes from a variant to the baseline exercise', () => {
      // SSB factor = 0.9 relative to competition squat → competition e1RM = SSB e1RM / 0.9
      const rawE1RM = calcE1RM(315, 3);
      const result = normalizeToBaseE1RM(
        315,
        3,
        ssbSquat,
        competitionSquat,
        statsWithFactor,
        competitionSquat
      );
      expect(result).toBeCloseTo(rawE1RM / 0.9);
    });

    it('normalizes from the baseline to a variant', () => {
      // Wide factor = 1.05 → wide e1RM = competition e1RM * 1.05
      const rawE1RM = calcE1RM(315, 3);
      const result = normalizeToBaseE1RM(
        315,
        3,
        competitionSquat,
        wideSquat,
        statsWithFactor,
        competitionSquat
      );
      expect(result).toBeCloseTo(rawE1RM * 1.05);
    });

    it('normalizes between two non-baseline variants', () => {
      // SSB (0.9) → Wide (1.05): wide = (e1rm / 0.9) * 1.05
      const rawE1RM = calcE1RM(315, 3);
      const result = normalizeToBaseE1RM(
        315,
        3,
        ssbSquat,
        wideSquat,
        statsWithFactor,
        competitionSquat
      );
      expect(result).toBeCloseTo((rawE1RM / 0.9) * 1.05);
    });

    it('strips addlWts before applying the variant factor for cross-family source', () => {
      // variantFactors are fitted against chain-stripped weights (see useLastSessionStats pass 4),
      // so the raw weight must be adjusted by addlWtOffset before dividing by the factor.
      // source: SSB Squat + Chains (cross-family from competition baseline)
      // chains offset = -20, SSB Chains factor = 0.9 (fitted against adjusted weights)
      // effectiveWeight = 315 + (-20) = 295
      // competition e1RM = calcE1RM(295, 3) / 0.9
      const stats: RepCalcStats = {
        addlWtOffset: new Map([['SSB Squat + Chains', { offset: -20, sampleCount: 3 }]]),
        variantFactor: new Map([
          [
            'SSB Squat + Chains',
            {
              factor: 0.9,
              sampleCount: 5,
              label: 'SSB + chains',
              baselineName: 'Competition Squat',
            },
          ],
        ]),
      };
      const effectiveE1RM = calcE1RM(315 + -20, 3);
      const result = normalizeToBaseE1RM(
        315,
        3,
        ssbChainSquat,
        competitionSquat,
        stats,
        competitionSquat
      );
      expect(result).toBeCloseTo(effectiveE1RM / 0.9);
      // Verify it differs from the naive (non-stripped) result
      expect(result).not.toBeCloseTo(calcE1RM(315, 3) / 0.9);
    });

    it('falls back to raw e1RM when cross-family source has addlWts but no offset data', () => {
      const stats: RepCalcStats = {
        addlWtOffset: new Map(),
        variantFactor: new Map([
          [
            'SSB Squat + Chains',
            {
              factor: 0.9,
              sampleCount: 5,
              label: 'SSB + chains',
              baselineName: 'Competition Squat',
            },
          ],
        ]),
      };
      const result = normalizeToBaseE1RM(
        315,
        3,
        ssbChainSquat,
        competitionSquat,
        stats,
        competitionSquat
      );
      expect(result).toBeCloseTo(calcE1RM(315, 3) / 0.9);
    });

    it('returns null when source factor is missing', () => {
      const result = normalizeToBaseE1RM(
        315,
        3,
        ssbSquat,
        competitionSquat,
        emptyStats,
        competitionSquat
      );
      expect(result).toBeNull();
    });

    it('returns null when target factor is missing', () => {
      const result = normalizeToBaseE1RM(
        315,
        3,
        competitionSquat,
        ssbSquat,
        emptyStats,
        competitionSquat
      );
      expect(result).toBeNull();
    });

    it('returns null when source factor has zero samples', () => {
      const stats: RepCalcStats = {
        addlWtOffset: new Map(),
        variantFactor: new Map([
          [
            'SSB Squat',
            { factor: 0.9, sampleCount: 0, label: 'SSB', baselineName: 'Competition Squat' },
          ],
        ]),
      };
      expect(
        normalizeToBaseE1RM(315, 3, ssbSquat, competitionSquat, stats, competitionSquat)
      ).toBeNull();
    });

    it('returns null when neither exercise is the baseline and no baseline is provided', () => {
      expect(normalizeToBaseE1RM(315, 3, ssbSquat, competitionSquat, statsWithFactor)).toBeNull();
    });

    it('works between two variants without a baseline when both have factor entries', () => {
      // Both SSB and Wide have factor entries — no baseline param needed
      const rawE1RM = calcE1RM(315, 3);
      const result = normalizeToBaseE1RM(315, 3, ssbSquat, wideSquat, statsWithFactor);
      expect(result).toBeCloseTo((rawE1RM / 0.9) * 1.05);
    });
  });
});
