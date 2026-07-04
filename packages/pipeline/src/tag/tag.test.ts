import { describe, it, expect } from 'vitest';
import { SetRecord } from '../types';
import { tagRecords, matches } from './tag';
import exerciseMap from './exercise-map.json';

describe('tagRecords', () => {
  it('tags records with map entries', () => {
    const records: SetRecord[] = [
      {
        date: 1706745600000,
        exercise: 'Bench',
        weight: 102.06,
        reps: 5,
        rpe: 8,
      },
    ];

    const { tagged, unknown } = tagRecords(records, exerciseMap);

    expect(tagged).toHaveLength(1);
    expect(tagged[0].canonical).toBe('bench');
    expect(tagged[0].tags).toEqual(new Set(['lift:bench']));
    expect(unknown).toHaveLength(0);
  });

  it('excludes unknown exercises from tagged output', () => {
    const records: SetRecord[] = [
      {
        date: 1706745600000,
        exercise: 'Unknown Exercise',
        weight: 100,
        reps: 5,
      },
    ];

    const { tagged, unknown } = tagRecords(records, exerciseMap);

    expect(tagged).toHaveLength(0);
    expect(unknown).toEqual(['Unknown Exercise']);
  });

  it('deduplicates unknown exercise names', () => {
    const records: SetRecord[] = [
      {
        date: 1706745600000,
        exercise: 'Unknown Exercise',
        weight: 100,
        reps: 5,
      },
      {
        date: 1706745600000,
        exercise: 'Unknown Exercise',
        weight: 110,
        reps: 3,
      },
      {
        date: 1706745600000,
        exercise: 'Another Unknown',
        weight: 90,
        reps: 8,
      },
    ];

    const { tagged, unknown } = tagRecords(records, exerciseMap);

    expect(tagged).toHaveLength(0);
    expect(unknown).toHaveLength(2);
    expect(new Set(unknown)).toEqual(new Set(['Unknown Exercise', 'Another Unknown']));
  });

  it('handles mixed known and unknown exercises', () => {
    const records: SetRecord[] = [
      {
        date: 1706745600000,
        exercise: 'Bench',
        weight: 102.06,
        reps: 5,
        rpe: 8,
      },
      {
        date: 1706745600000,
        exercise: 'Unknown Exercise',
        weight: 100,
        reps: 5,
      },
      {
        date: 1706745600000,
        exercise: 'Squat',
        weight: 136.08,
        reps: 3,
      },
    ];

    const { tagged, unknown } = tagRecords(records, exerciseMap);

    expect(tagged).toHaveLength(2);
    expect(unknown).toEqual(['Unknown Exercise']);
  });

  it('tags near-variant exercise names to the same canonical', () => {
    const records: SetRecord[] = [
      {
        date: 1706745600000,
        exercise: 'Bench',
        weight: 102.06,
        reps: 5,
      },
      {
        date: 1706745600000,
        exercise: 'bench press',
        weight: 106.59,
        reps: 3,
      },
      {
        date: 1706745600000,
        exercise: 'Comp Bench',
        weight: 111.13,
        reps: 1,
      },
    ];

    const { tagged, unknown } = tagRecords(records, exerciseMap);

    expect(tagged).toHaveLength(3);
    expect(unknown).toHaveLength(0);

    const canonicals = tagged.map((r) => r.canonical);
    expect(canonicals).toEqual(['bench', 'bench', 'bench']);
  });

  it('preserves all record properties', () => {
    const record: SetRecord = {
      date: 1706745600000,
      exercise: 'Bench',
      weight: 102.06,
      reps: 5,
      rpe: 8,
      meta: { rawUnit: 'lbs', rawWeight: '225' },
    };
    const records = [record];

    const { tagged } = tagRecords(records, exerciseMap);

    expect(tagged[0]).toMatchObject({
      date: record.date,
      exercise: record.exercise,
      weight: record.weight,
      reps: record.reps,
      rpe: record.rpe,
      meta: record.meta,
      canonical: 'bench',
      tags: new Set(['lift:bench']),
    });
  });

  it('includes all tags from map entry', () => {
    const records: SetRecord[] = [
      {
        date: 1706745600000,
        exercise: 'Comp Bench',
        weight: 111.13,
        reps: 1,
      },
    ];

    const { tagged } = tagRecords(records, exerciseMap);

    expect(tagged[0].tags).toEqual(new Set(['lift:bench', 'comp-lift']));
  });
});

describe('matches', () => {
  it('returns true when no query provided', () => {
    const tags = new Set(['lift:bench', 'comp-lift']);
    expect(matches(tags, {})).toBe(true);
  });

  it('matches all required tags', () => {
    const tags = new Set(['lift:bench', 'comp-lift']);
    expect(matches(tags, { all: ['lift:bench', 'comp-lift'] })).toBe(true);
  });

  it('fails when not all required tags present', () => {
    const tags = new Set(['lift:bench']);
    expect(matches(tags, { all: ['lift:bench', 'comp-lift'] })).toBe(false);
  });

  it('requires only one tag from any list', () => {
    const tags = new Set(['lift:bench', 'addl:chains']);
    expect(matches(tags, { any: ['lift:squat', 'comp-lift', 'lift:bench'] })).toBe(true);
  });

  it('fails when no tags from any list present', () => {
    const tags = new Set(['lift:bench']);
    expect(matches(tags, { any: ['lift:squat', 'comp-lift'] })).toBe(false);
  });

  it('requires none of the excluded tags', () => {
    const tags = new Set(['lift:bench']);
    expect(matches(tags, { none: ['comp-lift', 'lift:squat'] })).toBe(true);
  });

  it('fails when any excluded tag is present', () => {
    const tags = new Set(['lift:bench', 'comp-lift']);
    expect(matches(tags, { none: ['comp-lift'] })).toBe(false);
  });

  it('combines all, any, and none with AND logic', () => {
    const tags = new Set(['lift:bench', 'comp-lift', 'addl:chains']);

    expect(
      matches(tags, {
        all: ['lift:bench'],
        any: ['comp-lift', 'variation'],
        none: ['lift:squat'],
      })
    ).toBe(true);

    expect(
      matches(tags, {
        all: ['lift:bench'],
        any: ['lift:squat'],
        none: ['comp-lift'],
      })
    ).toBe(false);

    expect(
      matches(tags, {
        all: ['lift:bench'],
        any: ['comp-lift'],
        none: ['comp-lift'],
      })
    ).toBe(false);
  });

  it('works with namespaced tags', () => {
    const tags = new Set(['lift:bench', 'bar:olympic']);
    expect(matches(tags, { all: ['lift:bench', 'bar:olympic'] })).toBe(true);
  });

  it('works with bare tags', () => {
    const tags = new Set(['comp-lift', 'variation']);
    expect(matches(tags, { all: ['comp-lift'] })).toBe(true);
  });

  it('treats namespaced and bare tags identically', () => {
    const tagsNamespaced = new Set(['lift:bench']);
    const tagsBare = new Set(['comp-lift']);

    expect(matches(tagsNamespaced, { all: ['lift:bench'] })).toBe(true);
    expect(matches(tagsBare, { all: ['comp-lift'] })).toBe(true);
  });

  it('handles empty any list', () => {
    const tags = new Set(['lift:bench']);
    expect(matches(tags, { any: [] })).toBe(false);
  });

  it('handles empty all list', () => {
    const tags = new Set(['lift:bench']);
    expect(matches(tags, { all: [] })).toBe(true);
  });

  it('handles empty none list', () => {
    const tags = new Set(['lift:bench']);
    expect(matches(tags, { none: [] })).toBe(true);
  });
});
