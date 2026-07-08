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
  ])('builds distinct canonicals for %s', (_, exercise, expectedCanonical) => {
    const parsed = parseExercise(exercise);
    expect(buildCanonical(parsed, exercise)).toBe(expectedCanonical);
  });

  it('distinguishes light vs mini rev. bands deadlifts', () => {
    const lightParsed = parseExercise('Deadlift (light rev. bands)');
    const miniParsed = parseExercise('Deadlift (mini rev. bands)');

    const lightCanonical = buildCanonical(lightParsed, 'Deadlift (light rev. bands)');
    const miniCanonical = buildCanonical(miniParsed, 'Deadlift (mini rev. bands)');

    expect(lightCanonical).not.toBe(miniCanonical);
    expect(lightCanonical).toBe('deadlift-rev-bands-light');
    expect(miniCanonical).toBe('deadlift-rev-bands-mini');
  });

  it.each([
    ['2 chains vs double chains', 'Bench (2 chains)', 'Bench (double chains)', 'bench-chains-2'],
    ['2 chain singular', 'Bench (2 chain)', 'Bench (2 chains)', 'bench-chains-2'],
  ])(
    'produces same canonical for equivalent phrasings: %s',
    (_, exerciseA, exerciseB, expectedCanonical) => {
      const parsedA = parseExercise(exerciseA);
      const parsedB = parseExercise(exerciseB);

      expect(buildCanonical(parsedA, exerciseA)).toBe(expectedCanonical);
      expect(buildCanonical(parsedB, exerciseB)).toBe(expectedCanonical);
    }
  );

  it('keeps bare single-chain suffix-free (no -1)', () => {
    const parsed = parseExercise('Sumo Squat (chains)');
    const canonical = buildCanonical(parsed, 'Sumo Squat (chains)');

    expect(canonical).toBe('squat-sumo-chains');
    expect(canonical).not.toContain('-1');
  });

  it('appends magnitude suffix for all band/rev-band cases including unspecified', () => {
    const cases = [
      ['Squat (light bands)', 'squat-bands-light'],
      ['Squat (bands)', 'squat-bands-unspecified'],
      ['Deadlift (rev. bands)', 'deadlift-rev-bands-unspecified'],
    ];

    for (const [exercise, expectedCanonical] of cases) {
      const parsed = parseExercise(exercise);
      expect(buildCanonical(parsed, exercise)).toBe(expectedCanonical);
    }
  });
});

describe('buildTagsAndEffects with magnitude-qualified lookup', () => {
  it('emits magnitude-qualified tags for addl:wts', () => {
    const cases = [
      ['Bench (chains)', 'addl:chains:1'],
      ['Bench (2 chains)', 'addl:chains:2'],
      ['Squat (light bands)', 'addl:bands:light'],
      ['Deadlift (heavy rev. bands)', 'addl:rev-bands:heavy'],
    ];

    for (const [exercise, expectedTag] of cases) {
      const parsed = parseExercise(exercise);
      const { tags } = buildTagsAndEffects(parsed);
      expect(tags.has(expectedTag)).toBe(true);
    }
  });

  it('falls back to bare-category key for effects when magnitude-qualified key not found', () => {
    const parsed = parseExercise('Deadlift (light rev. bands)');
    const { tags, effects } = buildTagsAndEffects(parsed);

    // Tag should be magnitude-qualified
    expect(tags.has('addl:rev-bands:light')).toBe(true);

    // Effects should come from bare fallback key (addl:rev-bands:deadlift)
    expect(new Set(effects)).toEqual(new Set(['SUPRAMAXIMAL', 'LOCKOUT']));
  });

  it('includes magnitude-qualified tag even with bare-key effects fallback', () => {
    const parsed = parseExercise('Bench (mini bands)');
    const { tags, effects } = buildTagsAndEffects(parsed);

    // Tag must be magnitude-qualified
    expect(tags.has('addl:bands:mini')).toBe(true);

    // Effects come from bare key (addl:bands:bench)
    expect(new Set(effects)).toEqual(new Set(['BAR_SPEED']));
  });

  it('preserves bare single-chain in tags as magnitude-qualified addl:chains:1', () => {
    const parsed = parseExercise('Sumo Squat (chains)');
    const { tags } = buildTagsAndEffects(parsed);

    expect(tags.has('addl:chains:1')).toBe(true);
    expect(tags.has('lift:squat')).toBe(true);
    expect(tags.has('stance:sumo')).toBe(true);
  });

  it('collects effects from multiple components (stance + addl:wts)', () => {
    const parsed = parseExercise('Sumo Squat (chains)');
    const { effects } = buildTagsAndEffects(parsed);

    // Should include both stance:sumo effects and addl:chains effects
    const effectSet = new Set(effects);
    expect(effectSet.has('HIP_DOMINANT')).toBe(true); // from stance:sumo:squat
    expect(effectSet.has('POSTERIOR_CHAIN')).toBe(true); // from stance:sumo:squat
    expect(effectSet.has('BAR_SPEED')).toBe(true); // from addl:chains:squat
  });
});
