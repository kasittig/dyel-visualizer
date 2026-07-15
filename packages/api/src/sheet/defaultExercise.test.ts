import { describe, it, expect } from 'vitest';
import { defaultCompExerciseCanonical } from './defaultExercise';
import type { TaggedSetRecord } from '@dyel/pipeline';

const rec = (canonical: string, tags = ['lift:squat', 'comp-lift']): TaggedSetRecord => ({
  date: Date.UTC(2024, 0, 1),
  exercise: canonical,
  weight: 100,
  reps: 1,
  canonical,
  tags: new Set(tags),
  effects: [],
  baselineRange: null,
});

describe('defaultCompExerciseCanonical', () => {
  it('handles base conditions and filtering fallbacks', () => {
    expect(defaultCompExerciseCanonical([])).toBeNull();
    expect(defaultCompExerciseCanonical([rec('squat')])).toBe('squat');
    expect(
      defaultCompExerciseCanonical([
        rec('squat-ssb', ['lift:squat', 'bar:ssb']),
        rec('squat-cambered', ['lift:squat', 'bar:cambered']),
      ])
    ).toBe('squat-ssb');
  });

  it.each([
    [
      'prefers base competition lift',
      [rec('squat-ssb', ['lift:squat', 'bar:ssb']), rec('squat')],
      'squat',
    ],
    [
      'excludes equipment entries',
      [rec('squat-box', ['lift:squat', 'equip:box']), rec('squat')],
      'squat',
    ],
    [
      'excludes added resistance strings',
      [rec('squat-bands', ['lift:squat', 'addl:bands:1']), rec('squat')],
      'squat',
    ],
    [
      'prefers pause commands on bench',
      [
        rec('bench', ['lift:bench', 'comp-lift']),
        rec('bench-pause', ['lift:bench', 'equip:pause']),
      ],
      'bench-pause',
    ],
    [
      'keeps raw bench over alternative bars',
      [rec('bench-ssb', ['lift:bench', 'bar:ssb']), rec('bench', ['lift:bench', 'comp-lift'])],
      'bench',
    ],
    [
      'bypasses pause priority for non-bench',
      [rec('squat-pause', ['lift:squat', 'equip:pause']), rec('squat')],
      'squat',
    ],
  ])('%s', (_, records, expected) => expect(defaultCompExerciseCanonical(records)).toBe(expected));

  it.each([
    [
      'selects sumo with competition tag',
      [
        rec('deadlift-sumo', ['lift:deadlift', 'stance:sumo', 'competition', 'equip:rack']),
        rec('deadlift-conventional', ['lift:deadlift', 'stance:conventional', 'equip:rack']),
      ],
      'deadlift-sumo',
    ],
    [
      'selects conventional with competition tag',
      [
        rec('deadlift-sumo', ['lift:deadlift', 'stance:sumo', 'equip:rack']),
        rec('deadlift-conventional', [
          'lift:deadlift',
          'stance:conventional',
          'competition',
          'equip:rack',
        ]),
      ],
      'deadlift-conventional',
    ],
    [
      'falls back to first when no competition tag',
      [
        rec('deadlift-sumo', ['lift:deadlift', 'stance:sumo', 'equip:rack']),
        rec('deadlift-box', ['lift:deadlift', 'equip:box', 'equip:rack']),
      ],
      'deadlift-sumo',
    ],
  ])('deadlift stance routing: %s', (_, records, expected) =>
    expect(defaultCompExerciseCanonical(records)).toBe(expected)
  );
});
