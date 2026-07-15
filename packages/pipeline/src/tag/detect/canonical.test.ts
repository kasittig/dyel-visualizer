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
  ])('builds distinct canonicals for %s', (_, ex: string, expected: string) => {
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

    [
      ['Squat (light bands)', 'squat-bands-light'],
      ['Squat (bands)', 'squat-bands-unspecified'],
      ['Deadlift (rev. bands)', 'deadlift-rev-bands-unspecified'],
    ].forEach(([ex, expected]: string[]) => {
      expect(buildCanonical(parseExercise(ex), ex)).toBe(expected);
    });
  });
});

describe('buildTagsAndEffects with magnitude-qualified lookup', () => {
  it('emits magnitude-qualified tags and handles bare-key fallback effects', () => {
    [
      ['Bench (chains)', 'addl:chains:1'],
      ['Bench (2 chains)', 'addl:chains:2'],
      ['Squat (light bands)', 'addl:bands:light'],
      ['Deadlift (heavy rev. bands)', 'addl:rev-bands:heavy'],
    ].forEach(([ex, tag]: string[]) => {
      expect(buildTagsAndEffects(ex).tags.has(tag)).toBe(true);
    });

    const revRes = buildTagsAndEffects('Deadlift (light rev. bands)');
    expect(revRes.tags.has('addl:rev-bands:light')).toBe(true);
    expect(new Set(revRes.effects)).toEqual(new Set(['SUPRAMAXIMAL', 'LOCKOUT']));

    const bndRes = buildTagsAndEffects('Bench (mini bands)');
    expect(bndRes.tags.has('addl:bands:mini')).toBe(true);
    expect(new Set(bndRes.effects)).toEqual(new Set(['BAR_SPEED']));
  });

  it('preserves single-chain layouts and maps component effects', () => {
    const res = buildTagsAndEffects('Sumo Squat (chains)');
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
  ])('%s', (_, ex: string, expected: { min: number; max: number } | null) => {
    expect(buildTagsAndEffects(ex).range).toEqual(expected);
  });
});

describe('buildTagsAndEffects bare comp-lift tags', () => {
  it.each([
    ['bare Squat gets comp-lift + bar:standard + stance:competition', 'Squat'],
    ['bare Bench gets comp-lift + bar:standard + stance:competition', 'Bench'],
    ['bare Deadlift gets comp-lift + bar:standard + stance:competition', 'Deadlift'],
  ])('%s', (_, ex: string) => {
    const res = buildTagsAndEffects(ex);
    expect(res.tags.has('comp-lift')).toBe(true);
    expect(res.tags.has('bar:standard')).toBe(true);
    expect(res.tags.has('stance:competition')).toBe(true);
  });

  it.each([
    [
      'SSB Squat (non-bare, has bar:ssb) does NOT get bar:standard',
      'Squat (SSB)',
      'bar:standard',
      false,
    ],
    [
      'Sumo Squat (non-bare, has stance:sumo) does NOT get stance:competition',
      'Sumo Squat',
      'stance:competition',
      false,
    ],
    [
      'Bench (chains) (non-bare, has addl:chains) does NOT get comp-lift',
      'Bench (chains)',
      'comp-lift',
      false,
    ],
  ])('%s', (_, ex: string, tag: string, shouldHave: boolean) => {
    const res = buildTagsAndEffects(ex);
    expect(res.tags.has(tag)).toBe(shouldHave);
  });
});

describe('buildTagsAndEffects deadlift stance resolution', () => {
  it('handles variations of deadlift stance compounding mechanics', () => {
    expect(buildTagsAndEffects('Deadlift', 'sumo').range).toBeNull();
    expect(buildTagsAndEffects('Deadlift', 'sumo').effects).toEqual([]);
    expect(buildTagsAndEffects('Deadlift', 'sumo').tags.has('comp-lift')).toBe(true);
    expect(buildTagsAndEffects('Deadlift', 'conventional').range).toBeNull();
    expect(buildTagsAndEffects('Deadlift', 'conventional').effects).toEqual([]);

    const oppSumo = buildTagsAndEffects('Opposite Deadlift', 'sumo');
    expect(oppSumo.range).toEqual({ min: 90, max: 100 });
    expect(new Set(oppSumo.effects)).toEqual(new Set(['HAMSTRING_DOMINANT', 'POSTERIOR_CHAIN']));

    const oppConv = buildTagsAndEffects('Opposite Deadlift', 'conventional');
    expect(oppConv.range).toEqual({ min: 90, max: 100 });
    expect(new Set(oppConv.effects)).toEqual(new Set(['HIP_DOMINANT', 'POSTERIOR_CHAIN']));

    const explSumo = buildTagsAndEffects('Sumo Deadlift', 'conventional');
    expect(explSumo.range).toEqual({ min: 90, max: 100 });
    expect(new Set(explSumo.effects)).toEqual(new Set(['HIP_DOMINANT', 'POSTERIOR_CHAIN']));

    const explConv = buildTagsAndEffects('Conventional Deadlift', 'sumo');
    expect(explConv.range).toEqual({ min: 90, max: 100 });
    expect(new Set(explConv.effects)).toEqual(new Set(['HAMSTRING_DOMINANT', 'POSTERIOR_CHAIN']));

    expect(buildTagsAndEffects('Squat', 'sumo').range).toBeNull();
    expect(buildTagsAndEffects('Squat', 'sumo').effects).toEqual([]);

    const explSquatStance = buildTagsAndEffects('Sumo Squat', 'conventional');
    expect(explSquatStance.range).toEqual({ min: 90, max: 100 });
    expect(new Set(explSquatStance.effects)).toEqual(new Set(['HIP_DOMINANT', 'POSTERIOR_CHAIN']));

    const deficit = buildTagsAndEffects('Deadlift (2" deficit)', 'sumo');
    expect(deficit.range).toEqual({ min: 75, max: 85 });
    expect(new Set(deficit.effects)).toEqual(new Set(['EXTENDED_ROM', 'BOTTOM_RANGE']));
  });
});

describe('equipment magnitude produces distinct tags, effects, and ranges', () => {
  it.each([
    [
      'bench 1-board (default magnitude)',
      'Bench (1 board)',
      ['equip:board'],
      { min: 105, max: 115 },
      ['TRICEP_DOMINANT', 'SUPRAMAXIMAL'],
    ],
    [
      'bench 2-board',
      'Bench (2 board)',
      ['equip:board', 'equip:board-2'],
      { min: 115, max: 125 },
      ['TRICEP_DOMINANT', 'SUPRAMAXIMAL'],
    ],
    [
      'bench 3-board',
      'Bench (3 board)',
      ['equip:board', 'equip:board-3'],
      { min: 125, max: 135 },
      ['TRICEP_DOMINANT', 'SUPRAMAXIMAL'],
    ],
  ])(
    '%s produces expected tags and range',
    (_, ex: string, tags: string[], range: { min: number; max: number }, effects: string[]) => {
      const res = buildTagsAndEffects(ex);
      tags.forEach((t: string) => {
        expect(res.tags.has(t)).toBe(true);
      });
      expect(res.range).toEqual(range);
      expect(new Set(res.effects)).toEqual(new Set(effects));
    }
  );

  it('evaluates dynamic block and deficit sequence permutations', () => {
    (
      [
        ['Deadlift (1 block)', { min: 105, max: 115 }],
        ['Deadlift (2 blocks)', { min: 115, max: 125 }],
        ['Deadlift (3 blocks)', { min: 125, max: 135 }],
      ] as const
    ).forEach(([ex, range]) => {
      expect(buildTagsAndEffects(ex).range).toEqual(range);
    });

    (
      [
        ['Deadlift (1 deficit)', { min: 85, max: 95 }],
        ['Deadlift (2 deficit)', { min: 75, max: 85 }],
      ] as const
    ).forEach(([ex, range]) => {
      expect(buildTagsAndEffects(ex).range).toEqual(range);
    });
  });
});

describe('equipment magnitude fallback for unmapped magnitudes (regression guard)', () => {
  it('unmapped magnitude falls back to base key when no explicit entry exists', () => {
    const res = buildTagsAndEffects('Bench (4 board)');
    expect(res.tags.has('equip:board')).toBe(true);
    expect(res.tags.has('equip:board-4')).toBe(true);
    expect(res.range).toEqual({ min: 105, max: 115 });
    expect(new Set(res.effects)).toEqual(new Set(['TRICEP_DOMINANT', 'SUPRAMAXIMAL']));
  });
});
