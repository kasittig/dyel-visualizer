import { describe, it, expect } from 'vitest';
import { strengthTierForPercentile } from './strengthScores';

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
