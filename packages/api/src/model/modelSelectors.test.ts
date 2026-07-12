/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import type { LiftType, TaggedSetRecord } from '@dyel/pipeline';
import type { SplitRows } from '../sheet/parseSheetData';
import {
  detectDataUnit,
  collectSessionDates,
  collectVolumeRecords,
  defaultCanonicalsByLift,
  visibleLiftTypes,
} from './modelSelectors';

const emptyTabRows = (): Record<LiftType, SplitRows> => ({
  squat: { all: [], maxEffort: [], volume: [] },
  bench: { all: [], maxEffort: [], volume: [] },
  deadlift: { all: [], maxEffort: [], volume: [] },
  accessory: { all: [], maxEffort: [], volume: [] },
});

const rec = (
  date = Date.now(),
  canonical = 'squat',
  meta?: any,
  tags: string[] = []
): TaggedSetRecord =>
  ({
    tags: new Set(tags),
    date,
    canonical,
    reps: 5,
    weight: 100,
    exercise: canonical,
    effects: [],
    baselineRange: null,
    rpe: 8,
    meta: meta ?? undefined,
  }) as TaggedSetRecord;

const tabRowsWithSquat = (overrides?: any) => {
  const t = emptyTabRows();
  t.squat = {
    all: overrides?.squatAll ?? [],
    maxEffort: overrides?.squatMaxEffort ?? [],
    volume: overrides?.squatVolume ?? [],
  };
  return { ...t, ...overrides };
};

describe('modelSelectors', () => {
  describe('detectDataUnit', () => {
    it.each([
      [
        'lbs in squat',
        tabRowsWithSquat({ squatAll: [rec(1, 'squat', { rawUnit: 'lbs' })] }),
        'lbs',
      ],
      [
        'kg in bench',
        {
          ...emptyTabRows(),
          bench: { all: [rec(1, 'bench', { rawUnit: 'kg' })], maxEffort: [], volume: [] },
        },
        'kg',
      ],
      ['fallback', emptyTabRows(), 'lbs'],
      [
        'first rawUnit wins',
        {
          ...emptyTabRows(),
          squat: { all: [rec(1, 'squat', { rawUnit: 'lbs' })], maxEffort: [], volume: [] },
          bench: { all: [rec(1, 'bench', { rawUnit: 'kg' })], maxEffort: [], volume: [] },
        },
        'lbs',
      ],
      ['empty meta', tabRowsWithSquat({ squatAll: [rec(1, 'squat', {})] }), 'lbs'],
    ])('%s', (_, tabRows, expected) => {
      expect(detectDataUnit(tabRows)).toBe(expected);
    });
  });

  describe('collectSessionDates', () => {
    const d10 = new Date(2025, 0, 10),
      d15 = new Date(2025, 0, 15),
      d20 = new Date(2025, 0, 20);

    it('collects no records when no maxEffort records exist', () => {
      const res = collectSessionDates(emptyTabRows());
      expect(res.allSessionDates).toHaveLength(0);
      expect(res.lastSessionDate).toBeNull();
    });

    it('collects single session and deduplicates by day', () => {
      const res = collectSessionDates(
        tabRowsWithSquat({ squatMaxEffort: [rec(d15.getTime()), rec(d15.getTime() + 1000)] })
      );
      expect(res.allSessionDates).toHaveLength(1);
      expect(res.lastSessionDate?.toDateString()).toBe(d15.toDateString());
    });

    it('tracks multiple days without sorting & combines lift types', () => {
      const res = collectSessionDates({
        ...emptyTabRows(),
        squat: { all: [], maxEffort: [rec(d10.getTime())], volume: [] },
        bench: { all: [], maxEffort: [rec(d20.getTime())], volume: [] },
        deadlift: { all: [], maxEffort: [rec(d15.getTime())], volume: [] },
      });
      expect(res.allSessionDates).toHaveLength(3);
      expect(res.lastSessionDate?.toDateString()).toBe(d20.toDateString());
    });

    it('includes volume-only days as lastSessionDate when most recent', () => {
      const res = collectSessionDates({
        ...emptyTabRows(),
        squat: { all: [], maxEffort: [rec(d10.getTime())], volume: [rec(d20.getTime())] },
      });
      expect(res.allSessionDates).toHaveLength(2);
      expect(res.lastSessionDate?.toDateString()).toBe(d20.toDateString());
    });
  });

  describe('collectVolumeRecords', () => {
    it.each([
      ['no volume', emptyTabRows(), 0],
      ['squat volume only', tabRowsWithSquat({ squatVolume: [rec()] }), 1],
      [
        'all lifts contribute',
        {
          ...emptyTabRows(),
          squat: { all: [], maxEffort: [], volume: [rec()] },
          bench: { all: [], maxEffort: [], volume: [rec()] },
          deadlift: { all: [], maxEffort: [], volume: [rec()] },
          accessory: { all: [], maxEffort: [], volume: [rec()] },
        },
        4,
      ],
    ])('%s', (_, tabRows, expected) => {
      expect(collectVolumeRecords(tabRows)).toHaveLength(expected);
    });
  });

  describe('defaultCanonicalsByLift', () => {
    it.each([
      ['no records', emptyTabRows(), 'sumo', {}],
      [
        'single lift with canonical',
        tabRowsWithSquat({ squatAll: [rec(1, 'squat-comp', null, ['comp-lift'])] }),
        'sumo',
        { squat: 'squat-comp' },
      ],
      [
        'multiple lifts mapped',
        {
          ...emptyTabRows(),
          squat: { all: [rec(1, 'squat-comp', null, ['comp-lift'])], maxEffort: [], volume: [] },
          bench: { all: [rec(1, 'bench-comp', null, ['comp-lift'])], maxEffort: [], volume: [] },
          deadlift: {
            all: [rec(1, 'deadlift-sumo', null, ['lift:deadlift'])],
            maxEffort: [],
            volume: [],
          },
        },
        'sumo',
        { squat: 'squat-comp', bench: 'bench-comp', deadlift: 'deadlift-sumo' },
      ],
    ])('%s', (_, tabRows, stance, expected) => {
      expect(defaultCanonicalsByLift(tabRows, stance as any)).toEqual(expected);
    });
  });

  describe('visibleLiftTypes', () => {
    const d10 = new Date(2025, 0, 10),
      d15 = new Date(2025, 0, 15),
      d20 = new Date(2025, 0, 20),
      d25 = new Date(2025, 0, 25);
    const mockTabs = {
      ...emptyTabRows(),
      squat: { all: [rec(d10.getTime())], maxEffort: [], volume: [] },
      bench: { all: [rec(d15.getTime())], maxEffort: [], volume: [] },
      deadlift: { all: [rec(d20.getTime())], maxEffort: [], volume: [] },
      accessory: { all: [rec(d25.getTime())], maxEffort: [], volume: [] },
    };

    it.each([
      ['no records', emptyTabRows(), undefined, undefined, []],
      ['unfiltered', mockTabs, undefined, undefined, ['squat', 'bench', 'deadlift', 'accessory']],
      ['filter from (inclusive)', mockTabs, d15, undefined, ['bench', 'deadlift', 'accessory']],
      ['filter to (inclusive)', mockTabs, undefined, d15, ['squat', 'bench']],
      ['range boundaries', mockTabs, d10, d15, ['squat', 'bench']],
    ])('%s', (_, tabRows, from, to, expected) => {
      expect(visibleLiftTypes(tabRows, from, to)).toEqual(expected);
    });
  });
});
