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
    ['2" block deadlift (converts to 1 block)', 'Deadlift (2" blocks)', 'deadlift-blocks'],
    ['4" block deadlift (converts to 2 blocks)', 'Deadlift (4" blocks)', 'deadlift-blocks-2'],
    ['1 deficit deadlift', 'Deadlift (1 deficit)', 'deadlift-deficit'],
    ['2 deficit deadlift', 'Deadlift (2 deficit)', 'deadlift-deficit-2'],
    ['2" deficit deadlift', 'Deadlift (2" deficit)', 'deadlift-deficit'],
    ['4" deficit deadlift', 'Deadlift (4" deficit)', 'deadlift-deficit-2'],
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
    expect(new Set(revRes.effects)).toEqual(
      new Set(['SUPRAMAXIMAL', 'LOCKOUT', 'HAMSTRING_DOMINANT', 'POSTERIOR_CHAIN'])
    );

    const bndRes = buildTagsAndEffects('Bench (mini bands)');
    expect(bndRes.tags.has('addl:bands:mini')).toBe(true);
    expect(new Set(bndRes.effects)).toEqual(new Set(['BAR_SPEED', 'UPPER_PECS', 'REDUCED_ROM']));
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
    ['bare Squat resolves via default stance:lowbar', 'Squat', { min: 100, max: 100 }],
    ['single pct-bearing modifier (SSB squat)', 'Squat (SSB)', { min: 90, max: 95 }],
    [
      'addlWt-only modifier with default bench stance composition',
      'Bench (chains)',
      { min: 90, max: 100 },
    ],
    [
      'compound pct-bearing modifiers multiply (equipment then stance)',
      'Sumo Box Squat',
      { min: 81, max: 100 },
    ],
    [
      'bare block deadlift: stance value already covered by compound equipment key, not re-applied',
      'Deadlift (1 block)',
      { min: 103, max: 108 },
    ],
    [
      'sumo block deadlift: stance value already covered by compound equipment key, not re-applied',
      'Sumo Deadlift (1 block)',
      { min: 98, max: 105 },
    ],
    [
      'sumo 4" block deadlift (converts to magnitude 2): stance value already covered, not re-applied',
      'Sumo Deadlift (4" blocks)',
      { min: 90, max: 95 },
    ],
    [
      'conventional block deadlift: stance value already covered by compound equipment key, not re-applied',
      'Conventional Deadlift (1 block)',
      { min: 103, max: 108 },
    ],
    [
      'conventional 4" block deadlift (converts to magnitude 2): stance value already covered, not re-applied',
      'Conventional Deadlift (4" blocks)',
      { min: 108, max: 115 },
    ],
  ])('%s', (_, ex: string, expected: { min: number; max: number } | null) => {
    expect(buildTagsAndEffects(ex).range).toEqual(expected);
  });
});

describe('buildTagsAndEffects bare comp-lift tags', () => {
  it('bare Squat gets comp-lift + bar:standard + stance:lowbar + competition', () => {
    const res = buildTagsAndEffects('Squat');
    expect(res.tags.has('comp-lift')).toBe(true);
    expect(res.tags.has('bar:standard')).toBe(true);
    expect(res.tags.has('stance:lowbar')).toBe(true);
    expect(res.tags.has('competition')).toBe(true);
    expect(res.range).toEqual({ min: 100, max: 100 });
    expect(new Set(res.effects)).toEqual(new Set([]));
  });

  it('bare Bench gets comp-lift + bar:standard + stance:wide + competition', () => {
    const res = buildTagsAndEffects('Bench');
    expect(res.tags.has('comp-lift')).toBe(true);
    expect(res.tags.has('bar:standard')).toBe(true);
    expect(res.tags.has('stance:wide')).toBe(true);
    expect(res.tags.has('competition')).toBe(true);
    expect(res.range).toEqual({ min: 90, max: 100 });
    expect(new Set(res.effects)).toEqual(new Set(['UPPER_PECS', 'REDUCED_ROM']));
  });

  it('bare Deadlift gets comp-lift + bar:standard + stance:conventional (no competition tag)', () => {
    const res = buildTagsAndEffects('Deadlift');
    expect(res.tags.has('comp-lift')).toBe(true);
    expect(res.tags.has('bar:standard')).toBe(true);
    expect(res.tags.has('stance:conventional')).toBe(true);
    expect(res.tags.has('competition')).toBe(false);
    expect(res.range).toEqual({ min: 90, max: 100 });
    expect(new Set(res.effects)).toEqual(new Set(['HAMSTRING_DOMINANT', 'POSTERIOR_CHAIN']));
  });

  it.each([
    [
      'SSB Squat (non-bare, has bar:ssb) does NOT get bar:standard',
      'Squat (SSB)',
      'bar:standard',
      false,
    ],
    [
      'Sumo Squat (non-bare, has stance:sumo) does NOT get default stance:lowbar',
      'Sumo Squat',
      'stance:lowbar',
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

describe('buildTagsAndEffects deadlift stance parsing', () => {
  it('explicit deadlift stances resolve properly with their effects', () => {
    // Explicit sumo keyword still resolves to sumo stance with effects
    const explSumo = buildTagsAndEffects('Sumo Deadlift');
    expect(explSumo.range).toEqual({ min: 90, max: 100 });
    expect(new Set(explSumo.effects)).toEqual(new Set(['HIP_DOMINANT', 'POSTERIOR_CHAIN']));

    // Explicit conventional keyword also works
    const explConv = buildTagsAndEffects('Conventional Deadlift');
    expect(explConv.range).toEqual({ min: 90, max: 100 });
    expect(new Set(explConv.effects)).toEqual(new Set(['HAMSTRING_DOMINANT', 'POSTERIOR_CHAIN']));

    // Squat stance modifiers work as expected
    const explSquatStance = buildTagsAndEffects('Sumo Squat');
    expect(explSquatStance.range).toEqual({ min: 90, max: 100 });
    expect(new Set(explSquatStance.effects)).toEqual(new Set(['HIP_DOMINANT', 'POSTERIOR_CHAIN']));

    // Block/deficit deadlifts with explicit sumo still resolve with sumo effects. The
    // stance value is already covered by the compound equip:deficit:sumo:deadlift key, so
    // the generic stance:sumo:deadlift range is not re-applied on top of it.
    const deficit = buildTagsAndEffects('Sumo Deadlift (2" deficit)');
    expect(deficit.range).toEqual({ min: 90, max: 95 });
    expect(new Set(deficit.effects)).toEqual(
      new Set(['EXTENDED_ROM', 'BOTTOM_RANGE', 'HIP_DOMINANT', 'POSTERIOR_CHAIN'])
    );
  });
});

describe('equipment magnitude produces distinct tags, effects, and ranges', () => {
  it.each([
    [
      'bench 1-board (default magnitude)',
      'Bench (1 board)',
      ['equip:board'],
      { min: 95, max: 115 },
      ['TRICEP_DOMINANT', 'SUPRAMAXIMAL', 'UPPER_PECS', 'REDUCED_ROM'],
    ],
    [
      'bench 2-board',
      'Bench (2 board)',
      ['equip:board', 'equip:board-2'],
      { min: 104, max: 125 },
      ['TRICEP_DOMINANT', 'SUPRAMAXIMAL', 'UPPER_PECS', 'REDUCED_ROM'],
    ],
    [
      'bench 3-board',
      'Bench (3 board)',
      ['equip:board', 'equip:board-3'],
      { min: 113, max: 135 },
      ['TRICEP_DOMINANT', 'SUPRAMAXIMAL', 'UPPER_PECS', 'REDUCED_ROM'],
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
    // Bare (no explicit stance) block/deficit pulls now resolve via conventional stance,
    // the new default for bare Deadlifts. Unmapped magnitudes (e.g., magnitude 3 or
    // magnitude-2 deficit) still resolve null due to missing equipment entries.
    expect(buildTagsAndEffects('Deadlift (1 block)').range).toEqual({ min: 103, max: 108 });
    expect(buildTagsAndEffects('Deadlift (2 blocks)').range).toEqual({ min: 108, max: 115 });
    expect(buildTagsAndEffects('Deadlift (3 blocks)').range).toBeNull();
    expect(buildTagsAndEffects('Deadlift (1 deficit)').range).toEqual({ min: 92, max: 97 });
    expect(buildTagsAndEffects('Deadlift (2 deficit)').range).toBeNull();

    // With an explicit stance keyword, magnitude-tiered composition resolves via the
    // stance-qualified equipment keys. The stance value is already covered by these
    // compound keys, so the generic stance range is not re-applied on top of them.
    (
      [
        ['Sumo Deadlift (1 block)', { min: 98, max: 105 }],
        ['Sumo Deadlift (4" blocks)', { min: 90, max: 95 }],
        ['Conventional Deadlift (1 block)', { min: 103, max: 108 }],
        ['Conventional Deadlift (4" blocks)', { min: 108, max: 115 }],
        ['Sumo Deadlift (2" deficit)', { min: 90, max: 95 }],
      ] as const
    ).forEach(([ex, range]) => {
      expect(buildTagsAndEffects(ex).range).toEqual(range);
    });

    // Known gap: no magnitude-2 stance-qualified deficit entry exists yet, so this
    // combination still resolves null (not a bug — flagging so it isn't silently assumed).
    expect(buildTagsAndEffects('Sumo Deadlift (4" deficit)').range).toBeNull();
  });
});

describe('equipment magnitude fallback for unmapped magnitudes (regression guard)', () => {
  it('unmapped magnitude falls back to base key when no explicit entry exists', () => {
    const res = buildTagsAndEffects('Bench (4 board)');
    expect(res.tags.has('equip:board')).toBe(true);
    expect(res.tags.has('equip:board-4')).toBe(true);
    expect(res.range).toEqual({ min: 95, max: 115 });
    expect(new Set(res.effects)).toEqual(
      new Set(['TRICEP_DOMINANT', 'SUPRAMAXIMAL', 'UPPER_PECS', 'REDUCED_ROM'])
    );
  });
});
