import { describe, it, expect } from 'vitest';
import { strengthTierForPercentile, computeStrengthScores } from './strengthScores';

describe('strengthTierForPercentile', () => {
  it.each([
    ['world class (99+)', 99, 'World class'],
    ['world class (100)', 100, 'World class'],
    ['elite (90-98)', 90, 'Elite'],
    ['elite (95)', 95, 'Elite'],
    ['advanced (60-89)', 60, 'Advanced'],
    ['advanced (75)', 75, 'Advanced'],
    ['intermediate (30-59)', 30, 'Intermediate'],
    ['intermediate (45)', 45, 'Intermediate'],
    ['novice (0-29)', 0, 'Novice'],
    ['novice (15)', 15, 'Novice'],
    ['edge below 30', 29, 'Novice'],
    ['edge below 60', 59, 'Intermediate'],
    ['edge below 90', 89, 'Advanced'],
    ['edge below 99', 98, 'Elite'],
  ])('classifies %s', (_, percentile, expected) => {
    expect(strengthTierForPercentile(percentile)).toBe(expected);
  });
});

describe('computeStrengthScores — Schwartz-Malone female coefficient table', () => {
  it('produces a monotonically non-increasing score across the full 90-250lb bodyweight range for a fixed total (regression for the bodyweight-237 anomaly, strengthScores.ts:339)', () => {
    const total = 400;
    const scores = Array.from({ length: 250 - 90 + 1 }, (_, i) =>
      computeStrengthScores(90 + i, total, true, 'lbs')
    ).map((m) => m.schwartzmalone);

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1] + 1e-9);
    }
  });

  it('bodyweight 237 no longer scores higher than bodyweight 236 for an identical total', () => {
    const total = 400;
    const at236 = computeStrengthScores(236, total, true, 'lbs').schwartzmalone;
    const at237 = computeStrengthScores(237, total, true, 'lbs').schwartzmalone;
    const at238 = computeStrengthScores(238, total, true, 'lbs').schwartzmalone;

    expect(at237).toBeLessThanOrEqual(at236);
    expect(at238).toBeLessThanOrEqual(at237);
  });
});
