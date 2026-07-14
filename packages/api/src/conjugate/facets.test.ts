import { describe, it, expect } from 'vitest';
import { facetFamilyKey } from './facets';

describe('facetFamilyKey', () => {
  it.each([
    // Base exercises (no additional weight)
    ['base exercise', 'bench', 'bench'],
    ['multi-word base', 'bench-incline', 'bench-incline'],
    ['multi-word bar', 'squat-ssb', 'squat-ssb'],

    // Single-word addl slug stripping
    ['single bands', 'bench-bands', 'bench'],
    ['single chains', 'deadlift-chains', 'deadlift'],
    ['multi-word + chains', 'deadlift-deficit-chains', 'deadlift-deficit'],

    // Addl slug with numeric magnitude
    ['bands with magnitude', 'bench-bands-50', 'bench'],
    ['chains with magnitude', 'deadlift-chains-30', 'deadlift'],
    ['multi-word + bands magnitude', 'bench-incline-bands-25', 'bench-incline'],

    // Rev-bands stripping (new case)
    ['rev-bands basic', 'bench-rev-bands', 'bench'],
    ['squat + rev-bands', 'squat-rev-bands', 'squat'],
    ['multi-word + rev-bands', 'squat-ssb-rev-bands', 'squat-ssb'],

    // Rev-bands with numeric magnitude
    ['rev-bands with magnitude', 'bench-rev-bands-25', 'bench'],
    ['multi-word + rev-bands magnitude', 'deadlift-deficit-rev-bands-20', 'deadlift-deficit'],

    // Stacked/compound scenarios
    ['multiple words then rev-bands', 'bench-incline-pause-rev-bands', 'bench-incline-pause'],
    ['complex bar name + rev-bands', 'squat-cambered-rev-bands', 'squat-cambered'],
  ])('strips addl weights correctly with %s', (_, canonical, expected) => {
    expect(facetFamilyKey(canonical)).toBe(expected);
  });
});
