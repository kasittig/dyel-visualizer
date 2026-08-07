import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTIC_EFFECTS,
  mapWeaknessesToAccessoryCategories,
  type DiagnosticEffect,
} from './weaknessAccessoryCategories';

const expected = [
  ['BAR_SPEED', []],
  ['BOTTOM_RANGE', []],
  ['CONDITIONING', ['conditioning']],
  ['CORE_DEMAND', ['core']],
  ['DEAD_STOP', []],
  ['EXTENDED_ROM', []],
  ['HAMSTRING_DOMINANT', ['hamstrings']],
  ['HIP_DOMINANT', ['glutes', 'hamstrings']],
  ['LOCKOUT', []],
  ['LOWER_BACK_DEMAND', ['low-back']],
  ['LOWER_PECS', ['upper-push']],
  ['PEC_DOMINANT', ['upper-push']],
  ['POSTERIOR_CHAIN', ['hamstrings', 'glutes', 'low-back']],
  ['POSTERIOR_SHIFT', ['glutes', 'hamstrings']],
  ['QUAD_DOMINANT', ['quads']],
  ['REDUCED_ROM', []],
  ['STABILIZER_DEMAND', []],
  ['SUPRAMAXIMAL', []],
  ['TRICEP_DOMINANT', ['triceps']],
  ['UNILATERAL', []],
  ['UPPER_BACK_DEMAND', ['upper-pull']],
  ['UPPER_PECS', ['upper-push']],
  ['UPRIGHT_TORSO', []],
] satisfies readonly [DiagnosticEffect, readonly string[]][];

describe('mapWeaknessesToAccessoryCategories', () => {
  it.each(expected)('maps %s deterministically', (effect, categories) => {
    expect(mapWeaknessesToAccessoryCategories([{ effect, belowCount: 2, aboveCount: 0 }])).toEqual([
      expect.objectContaining({
        evidence: { effect, belowCount: 2, aboveCount: 0 },
        categories,
        status: categories.length ? 'mapped' : 'unsupported',
        provenance: 'reviewed-effect-map',
        rationale: expect.any(String),
      }),
    ]);
  });

  it('keeps the reviewed matrix exhaustive and reports unknown effects without guessing', () => {
    expect(expected.map(([effect]) => effect)).toEqual(DIAGNOSTIC_EFFECTS);
    expect(
      mapWeaknessesToAccessoryCategories([{ effect: 'NEW_EFFECT', belowCount: 1, aboveCount: 0 }])
    ).toEqual([
      {
        evidence: { effect: 'NEW_EFFECT', belowCount: 1, aboveCount: 0 },
        categories: [],
        status: 'unmapped',
        rationale: 'The effect is not part of the reviewed diagnostic effect map.',
        provenance: 'reviewed-effect-map',
      },
    ]);
  });

  it('maps only effects with net weakness evidence', () => {
    expect(
      mapWeaknessesToAccessoryCategories([
        { effect: 'CORE_DEMAND', belowCount: 1, aboveCount: 1 },
        { effect: 'QUAD_DOMINANT', belowCount: 0, aboveCount: 2 },
      ])
    ).toEqual([]);
  });
});
