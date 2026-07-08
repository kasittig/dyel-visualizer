import { describe, it, expect } from 'vitest';
import { parseExercise } from './parseExercise';
import { buildCanonical, buildTagsAndEffects } from './canonical';

describe('buildCanonical with magnitude-qualified modifiers', () => {
  it.each([
    ['light rev. bands deadlift', 'Deadlift (light rev. bands)', 'deadlift-rev-bands-light'],
    ['mini rev. bands deadlift', 'Deadlift (mini rev. bands)', 'deadlift-rev-bands-mini'],
    ['double chains bench', 'Bench (2 chains)', 'bench-chains-2'],
    ['heavy bands squat', 'Squat (heavy bands)', 'squat-bands-heavy'],
    ['unspecified bands squat', 'Squat (bands)', 'squat-bands-unspecified'],
    ['1 board bench', 'Bench (1 board)', 'bench-board'],
    ['2 board bench', 'Bench (2 board)', 'bench-board-2'],
    ['double board bench', 'Bench (double board)', 'bench-board-2'],
    ['1 block deadlift', 'Deadlift (1 block)', 'deadlift-blocks'],
    ['2 block deadlift', 'Deadlift (2 blocks)', 'deadlift-blocks-2'],
    ['2" block deadlift', 'Deadlift (2" blocks)', 'deadlift-blocks-2'],
    ['1 deficit deadlift', 'Deadlift (1 deficit)', 'deadlift-deficit'],
    ['2 deficit deadlift', 'Deadlift (2 deficit)', 'deadlift-deficit-2'],
    ['2" deficit deadlift', 'Deadlift (2" deficit)', 'deadlift-deficit-2'],
  ])('builds distinct canonicals for %s', (_, ex, expected) => {
    expect(buildCanonical(parseExercise(ex), ex)).toBe(expected);
  });

  it('verifies equivalence mapping rules and suffix exclusions', () => {
    expect(
      buildCanonical(parseExercise('Deadlift (light rev. bands)'), 'Deadlift (light rev. bands)')
    ).not.toBe(
      buildCanonical(parseExercise('Deadlift (mini rev. bands)'), 'Deadlift (mini rev. bands)')
    );
    expect(buildCanonical(parseExercise('Bench (2 chains)'), 'Bench (2 chains)')).toBe(
      'bench-chains-2'
    );
    expect(buildCanonical(parseExercise('Bench (double chains)'), 'Bench (double chains)')).toBe(
      'bench-chains-2'
    );
    expect(buildCanonical(parseExercise('Bench (2 chain)'), 'Bench (2 chain)')).toBe(
      'bench-chains-2'
    );
    expect(buildCanonical(parseExercise('Sumo Squat (chains)'), 'Sumo Squat (chains)')).toBe(
      'squat-sumo-chains'
    );

    const cases = [
      ['Squat (light bands)', 'squat-bands-light'],
      ['Squat (bands)', 'squat-bands-unspecified'],
      ['Deadlift (rev. bands)', 'deadlift-rev-bands-unspecified'],
    ];
    cases.forEach(([ex, expected]) => {
      expect(buildCanonical(parseExercise(ex), ex)).toBe(expected);
    });
  });
});

describe('buildTagsAndEffects with magnitude-qualified lookup', () => {
  it('emits magnitude-qualified tags and handles bare-key fallback effects', () => {
    const cases = [
      ['Bench (chains)', 'addl:chains:1'],
      ['Bench (2 chains)', 'addl:chains:2'],
      ['Squat (light bands)', 'addl:bands:light'],
      ['Deadlift (heavy rev. bands)', 'addl:rev-bands:heavy'],
    ];
    cases.forEach(([ex, tag]) => {
      expect(buildTagsAndEffects(parseExercise(ex)).tags.has(tag)).toBe(true);
    });

    const revRes = buildTagsAndEffects(parseExercise('Deadlift (light rev. bands)'));
    expect(revRes.tags.has('addl:rev-bands:light')).toBe(true);
    // Deadlift with no explicit stance (competition) + rev-bands: only rev-bands effects
    expect(new Set(revRes.effects)).toEqual(new Set(['SUPRAMAXIMAL', 'LOCKOUT']));

    const bndRes = buildTagsAndEffects(parseExercise('Bench (mini bands)'));
    expect(bndRes.tags.has('addl:bands:mini')).toBe(true);
    expect(new Set(bndRes.effects)).toEqual(new Set(['BAR_SPEED']));
  });

  it('preserves single-chain layouts and maps component effects', () => {
    const res = buildTagsAndEffects(parseExercise('Sumo Squat (chains)'));
    expect(res.tags.has('addl:chains:1')).toBe(true);
    expect(res.tags.has('lift:squat')).toBe(true);
    expect(res.tags.has('stance:sumo')).toBe(true);

    const fx = new Set(res.effects);
    expect(fx.has('HIP_DOMINANT')).toBe(true);
    expect(fx.has('POSTERIOR_CHAIN')).toBe(true);
    expect(fx.has('BAR_SPEED')).toBe(true);
  });
});

describe('buildTagsAndEffects baseline % range', () => {
  it.each([
    ['bare competition lift → no range (unassessed via range)', 'Squat', null],
    ['single pct-bearing modifier (SSB squat)', 'Squat (SSB)', { min: 90, max: 95 }],
    ['addlWt-only modifier → 100-100% fallback', 'Bench (chains)', { min: 100, max: 100 }],
    [
      'compound pct-bearing modifiers multiply (equipment then stance)',
      'Sumo Box Squat',
      { min: 81, max: 100 },
    ],
  ])('%s', (_, ex, expected) => {
    expect(buildTagsAndEffects(parseExercise(ex)).range).toEqual(expected);
  });
});

describe('buildTagsAndEffects deadlift stance resolution', () => {
  it('bare deadlift (competition stance) gets no range — matches legacy, not resolved', () => {
    const ex = parseExercise('Deadlift');
    const result = buildTagsAndEffects(ex, 'sumo');
    expect(result.range).toEqual(null);
    expect(result.effects).toEqual([]);
  });

  it('bare deadlift gets comp-lift tag even though stance is not resolved', () => {
    const ex = parseExercise('Deadlift');
    const result = buildTagsAndEffects(ex, 'sumo');
    expect(result.tags.has('comp-lift')).toBe(true);
  });

  it('bare deadlift (competition stance) with conventional preference also gets no range', () => {
    const ex = parseExercise('Deadlift');
    const result = buildTagsAndEffects(ex, 'conventional');
    expect(result.range).toEqual(null);
    expect(result.effects).toEqual([]);
  });

  it('flips opposite stance with sumo preference → conventional', () => {
    const ex = parseExercise('Opposite Deadlift');
    const result = buildTagsAndEffects(ex, 'sumo');
    expect(result.range).toEqual({ min: 90, max: 100 });
    expect(new Set(result.effects)).toEqual(new Set(['HAMSTRING_DOMINANT', 'POSTERIOR_CHAIN']));
  });

  it('flips opposite stance with conventional preference → sumo', () => {
    const ex = parseExercise('Opposite Deadlift');
    const result = buildTagsAndEffects(ex, 'conventional');
    expect(result.range).toEqual({ min: 90, max: 100 });
    expect(new Set(result.effects)).toEqual(new Set(['HIP_DOMINANT', 'POSTERIOR_CHAIN']));
  });

  it('uses explicit sumo stance regardless of preference', () => {
    const ex = parseExercise('Sumo Deadlift');
    const result = buildTagsAndEffects(ex, 'conventional');
    expect(result.range).toEqual({ min: 90, max: 100 });
    expect(new Set(result.effects)).toEqual(new Set(['HIP_DOMINANT', 'POSTERIOR_CHAIN']));
  });

  it('uses explicit conventional stance regardless of preference', () => {
    const ex = parseExercise('Conventional Deadlift');
    const result = buildTagsAndEffects(ex, 'sumo');
    expect(result.range).toEqual({ min: 90, max: 100 });
    expect(new Set(result.effects)).toEqual(new Set(['HAMSTRING_DOMINANT', 'POSTERIOR_CHAIN']));
  });

  it('does not apply stance resolution for non-deadlift lifts (no stance → no range)', () => {
    const ex = parseExercise('Squat');
    const result = buildTagsAndEffects(ex, 'sumo');
    expect(result.range).toEqual(null);
    expect(result.effects).toEqual([]);
  });

  it('does not apply stance resolution for non-deadlift lifts (explicit squat stance)', () => {
    const ex = parseExercise('Sumo Squat');
    const result = buildTagsAndEffects(ex, 'conventional');
    expect(result.range).toEqual({ min: 90, max: 100 });
    expect(new Set(result.effects)).toEqual(new Set(['HIP_DOMINANT', 'POSTERIOR_CHAIN']));
  });

  it('deficit deadlift (competition stance, no explicit stance keyword) gets only deficit range/effects', () => {
    const ex = parseExercise('Deadlift (2" deficit)');
    const result = buildTagsAndEffects(ex, 'sumo');
    // Deficit range only (85–95%), no stance range compounding
    expect(result.range).toEqual({ min: 85, max: 95 });
    // Deficit effects (EXTENDED_ROM, BOTTOM_RANGE), no stance-derived effects
    expect(new Set(result.effects)).toEqual(new Set(['EXTENDED_ROM', 'BOTTOM_RANGE']));
  });
});
