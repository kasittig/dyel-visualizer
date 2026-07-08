import { describe, it, expect } from 'vitest';
import type { SetRecord } from '../types';
import { tagRecords, resolveCanonicalNames, matches } from './tag';

describe('resolveCanonicalNames', () => {
  it('rewrites exercise, deduplicates unresolved entries, and matches keys', () => {
    const r1: SetRecord[] = [
      { date: 1706745600000, exercise: 'Bench', weight: 102.06, reps: 5, rpe: 8 },
    ];
    const res1 = resolveCanonicalNames(r1);
    expect(res1.resolved).toMatchObject([{ exercise: 'bench' }]);
    expect(res1.unknown).toEqual([]);

    const r2: SetRecord[] = [
      { date: 1706745600000, exercise: 'Unknown Exercise', weight: 100, reps: 5 },
      { date: 1706745600000, exercise: 'Unknown Exercise', weight: 110, reps: 3 },
      { date: 1706745600000, exercise: 'Another Unknown', weight: 90, reps: 8 },
    ];
    const res2 = resolveCanonicalNames(r2);
    expect(res2.resolved).toHaveLength(0);
    expect(new Set(res2.unknown)).toEqual(new Set(['Unknown Exercise', 'Another Unknown']));

    const r3: SetRecord[] = [
      { date: 1706745600000, exercise: 'Bench', weight: 102.06, reps: 5 },
      { date: 1706745600000, exercise: 'bench press', weight: 106.59, reps: 3 },
      { date: 1706745600000, exercise: 'Comp Bench', weight: 111.13, reps: 1 },
    ];
    expect(
      resolveCanonicalNames(r3).resolved.map((r: SetRecord) => {
        return r.exercise;
      })
    ).toEqual(['bench', 'bench', 'bench']);
  });
});

describe('tagRecords', () => {
  it('handles structural maps, invalid constraints, and mixed modifiers', () => {
    const rec: SetRecord = {
      date: 1706745600000,
      exercise: 'bench',
      weight: 102.06,
      reps: 5,
      rpe: 8,
      meta: { rawUnit: 'lbs', rawWeight: '225' },
    };
    const res1 = tagRecords([rec]);
    expect(res1.unknown).toEqual([]);
    expect(res1.tagged[0]).toMatchObject({
      ...rec,
      canonical: 'bench',
      tags: new Set(['lift:bench', 'comp-lift']),
    });

    const r2: SetRecord[] = [
      { date: 1706745600000, exercise: 'unknown-canonical', weight: 100, reps: 5 },
      { date: 1706745600000, exercise: 'unknown-canonical', weight: 110, reps: 3 },
      { date: 1706745600000, exercise: 'another-unknown', weight: 90, reps: 8 },
    ];
    const res2 = tagRecords(r2);
    expect(res2.tagged).toHaveLength(0);
    expect(new Set(res2.unknown)).toEqual(new Set(['unknown-canonical', 'another-unknown']));

    const r3: SetRecord[] = [
      { date: 1706745600000, exercise: 'bench', weight: 102.06, reps: 5 },
      { date: 1706745600000, exercise: 'unknown-canonical', weight: 100, reps: 5 },
      { date: 1706745600000, exercise: 'bench-chains', weight: 111.13, reps: 1 },
    ];
    const res3 = tagRecords(r3);
    expect(res3.unknown).toEqual(['unknown-canonical']);
    expect(res3.tagged[0].tags).toEqual(new Set(['lift:bench', 'comp-lift']));
    expect(res3.tagged[1].tags).toEqual(new Set(['lift:bench', 'addl:chains:1']));
  });
});

describe('keyword-detector parsing', () => {
  const rec = (ex: string): SetRecord[] => {
    return [{ date: 1706745600000, exercise: ex, weight: 100, reps: 5 }];
  };

  it.each([
    ['ssb squat', 'SSB Squat', 'squat-ssb', 'bar:ssb'],
    ['sumo deadlift', 'Sumo Deadlift', 'deadlift-sumo', 'stance:sumo'],
    ['incline bench', 'Incline Bench', 'bench-incline', 'equip:incline'],
  ])('detects %s as canonical %s with tag %s', (_, ex, canonical, tag) => {
    const { resolved } = resolveCanonicalNames(rec(ex));
    expect(resolved[0].exercise).toBe(canonical);
    expect(tagRecords(resolved).tagged[0].tags.has(tag)).toBe(true);
  });

  it('verifies specialized exclusions, composites, and fallback filters', () => {
    expect(resolveCanonicalNames(rec('Bench (CG)')).resolved[0].exercise).toBe('bench-close');
    expect(tagRecords(resolveCanonicalNames(rec('Bench (CG)')).resolved).tagged[0].tags).toEqual(
      new Set(['lift:bench', 'stance:close'])
    );
    expect(resolveCanonicalNames(rec('floor press')).resolved[0].exercise).toBe('bench-floor');
    expect(tagRecords(rec('bench-chains')).tagged[0].effects).toEqual(['BAR_SPEED']);

    const { resolved, tagged } = {
      ...resolveCanonicalNames(rec('sumo squat (chains)')),
      ...tagRecords(resolveCanonicalNames(rec('sumo squat (chains)')).resolved),
    };
    expect(resolved[0].exercise).toBe('squat-sumo-chains');
    expect(tagged[0].tags).toEqual(new Set(['lift:squat', 'stance:sumo', 'addl:chains:1']));
    expect(new Set(tagged[0].effects)).toEqual(
      new Set(['HIP_DOMINANT', 'POSTERIOR_CHAIN', 'BAR_SPEED'])
    );
  });

  it.each([
    ['unrecognized accessory name', 'Face Pulls', true],
    ['plain comp lift with all-default modifiers', 'Squat', false],
  ])('unknown heuristic filtering rules', (_, ex, isUnknown) => {
    const { resolved, unknown } = resolveCanonicalNames(rec(ex));
    if (isUnknown) {
      expect(unknown).toEqual([ex]);
      expect(resolved).toHaveLength(0);
    } else {
      expect(unknown).toHaveLength(0);
      expect(resolved).toHaveLength(1);
    }
  });
});

describe('matches', () => {
  it('correctly evaluates all logical tag match variations', () => {
    const t = new Set(['lift:bench', 'comp-lift', 'addl:chains', 'bar:olympic']);

    expect(matches(t, {})).toBe(true);
    expect(matches(t, { all: ['lift:bench', 'comp-lift'] })).toBe(true);
    expect(matches(new Set(['lift:bench']), { all: ['lift:bench', 'comp-lift'] })).toBe(false);
    expect(matches(t, { any: ['lift:squat', 'comp-lift', 'lift:bench'] })).toBe(true);
    expect(matches(new Set(['lift:bench']), { any: ['lift:squat', 'comp-lift'] })).toBe(false);
    expect(matches(new Set(['lift:bench']), { none: ['comp-lift', 'lift:squat'] })).toBe(true);
    expect(matches(t, { none: ['comp-lift'] })).toBe(false);
    expect(matches(t, { all: ['lift:bench', 'bar:olympic'] })).toBe(true);
    expect(matches(new Set(['comp-lift', 'variation']), { all: ['comp-lift'] })).toBe(true);
    expect(matches(t, { any: [] })).toBe(false);
    expect(matches(t, { all: [] })).toBe(true);
    expect(matches(t, { none: [] })).toBe(true);

    expect(
      matches(t, { all: ['lift:bench'], any: ['comp-lift', 'variation'], none: ['lift:squat'] })
    ).toBe(true);
    expect(matches(t, { all: ['lift:bench'], any: ['lift:squat'], none: ['comp-lift'] })).toBe(
      false
    );
    expect(matches(t, { all: ['lift:bench'], any: ['comp-lift'], none: ['comp-lift'] })).toBe(
      false
    );
  });
});
