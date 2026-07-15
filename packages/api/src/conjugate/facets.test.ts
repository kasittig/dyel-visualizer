import { describe, it, expect } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import { facetFamilyKey, canonicalsMatchingFacets } from './facets';

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

const rec = (canonical: string, tags: string[]): TaggedSetRecord => ({
  date: 0,
  weight: 100,
  reps: 5,
  rpe: undefined,
  canonical,
  exercise: canonical,
  tags: new Set(tags),
  effects: [],
  baselineRange: null,
  meta: undefined,
});

describe('canonicalsMatchingFacets', () => {
  const records = [
    rec('bench-ssb-close', ['bar:ssb', 'stance:close']),
    rec('bench-standard-comp', ['bar:standard', 'stance:competition']),
    rec('bench-board-2', ['equip:board-2']),
    rec('bench-chains', ['addl:chains']),
    rec('bench-no-tags', []),
  ];

  it.each([
    [
      'no selection matches every canonical',
      {},
      ['bench-ssb-close', 'bench-standard-comp', 'bench-board-2', 'bench-chains', 'bench-no-tags'],
    ],
    ['single facet: bar', { bar: 'ssb' }, ['bench-ssb-close']],
    ['single facet: stance', { stance: 'competition' }, ['bench-standard-comp']],
    ['single facet: equipment', { equipment: 'board' }, ['bench-board-2']],
    ['single facet: addlWt', { addlWt: 'chains' }, ['bench-chains']],
    ['combined facets: no match', { bar: 'ssb', stance: 'competition' }, []],
    ['combined facets: match', { bar: 'standard', stance: 'competition' }, ['bench-standard-comp']],
    ['facet with no matching records', { bar: 'trap' }, []],
  ] as Array<[string, Parameters<typeof canonicalsMatchingFacets>[1], string[]]>)(
    '%s',
    (_, selection, expected) => {
      expect(canonicalsMatchingFacets(records, selection)).toEqual(new Set(expected));
    }
  );

  it('deduplicates by canonical when the same canonical appears in multiple records', () => {
    const dupRecords = [rec('bench', ['bar:ssb']), rec('bench', ['bar:ssb'])];
    expect(canonicalsMatchingFacets(dupRecords, { bar: 'ssb' })).toEqual(new Set(['bench']));
  });

  it('returns an empty set for an empty record list regardless of selection', () => {
    expect(canonicalsMatchingFacets([], {})).toEqual(new Set());
    expect(canonicalsMatchingFacets([], { bar: 'ssb' })).toEqual(new Set());
  });
});
