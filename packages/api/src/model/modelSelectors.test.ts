/* eslint-disable @typescript-eslint/no-explicit-any -- `as any` factories are allowed in tests (see root CLAUDE.md) */
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

// Factory functions for test data
const emptyTabRows = (): Record<LiftType, SplitRows> => ({
  squat: { all: [], maxEffort: [], volume: [] },
  bench: { all: [], maxEffort: [], volume: [] },
  deadlift: { all: [], maxEffort: [], volume: [] },
  accessory: { all: [], maxEffort: [], volume: [] },
});

const rec = (
  date: number = Date.now(),
  canonical: string = 'squat',
  meta?: any,
  tags: string[] = []
): TaggedSetRecord => ({
  t: 1,
  v: 100,
  series: canonical,
  tags: new Set(tags),
  date,
  canonical,
  sets: 1,
  rpe: 8,
  meta: meta ?? undefined,
});

const tabRowsWithSquat = (overrides?: any) => {
  const tabs = emptyTabRows();
  tabs.squat = {
    all: overrides?.squatAll ?? [],
    maxEffort: overrides?.squatMaxEffort ?? [],
    volume: overrides?.squatVolume ?? [],
    ...overrides?.squat,
  };
  return { ...tabs, ...overrides };
};

const tabRowsWithMultiLifts = (overrides?: any) => {
  const tabs = emptyTabRows();
  return {
    ...tabs,
    ...overrides,
  };
};

describe('modelSelectors', () => {
  describe('detectDataUnit', () => {
    it.each([
      [
        'with lbs rawUnit in squat',
        tabRowsWithSquat({ squatAll: [rec(Date.now(), 'squat', { rawUnit: 'lbs' })] }),
        'lbs',
      ],
      [
        'with kg rawUnit in bench',
        tabRowsWithMultiLifts({
          bench: {
            all: [rec(Date.now(), 'bench', { rawUnit: 'kg' })],
            maxEffort: [],
            volume: [],
          },
        }),
        'kg',
      ],
      ['no rawUnit found (fallback)', emptyTabRows(), 'lbs'],
      [
        'first rawUnit wins (squat before bench)',
        tabRowsWithMultiLifts({
          squat: {
            all: [rec(Date.now(), 'squat', { rawUnit: 'lbs' })],
            maxEffort: [],
            volume: [],
          },
          bench: {
            all: [rec(Date.now(), 'bench', { rawUnit: 'kg' })],
            maxEffort: [],
            volume: [],
          },
        }),
        'lbs',
      ],
      [
        'empty meta falls through',
        tabRowsWithSquat({ squatAll: [rec(Date.now(), 'squat', {})] }),
        'lbs',
      ],
    ])('detects unit: %s', (_, tabRows, expected) => {
      expect(detectDataUnit(tabRows)).toBe(expected);
    });
  });

  describe('collectSessionDates', () => {
    it('collects no records when no maxEffort records exist', () => {
      const result = collectSessionDates(emptyTabRows());
      expect(result.allSessionDates).toHaveLength(0);
      expect(result.lastSessionDate).toBe(null);
    });

    it('collects single session', () => {
      const tabRows = tabRowsWithSquat({
        squatMaxEffort: [rec(Date.now(), 'squat')],
      });
      const result = collectSessionDates(tabRows);
      expect(result.allSessionDates).toHaveLength(1);
      expect(result.lastSessionDate).toBeInstanceOf(Date);
    });

    it('deduplicates dates by calendar day', () => {
      const baseDate = new Date(2025, 0, 15, 10, 0, 0); // Jan 15, 2025 10:00 AM local time
      const tabRows = tabRowsWithSquat({
        squatMaxEffort: [
          rec(baseDate.getTime(), 'squat'),
          rec(new Date(2025, 0, 15, 14, 0, 0).getTime(), 'squat'),
          rec(new Date(2025, 0, 15, 18, 0, 0).getTime(), 'squat'),
        ],
      });
      const result = collectSessionDates(tabRows);
      expect(result.allSessionDates).toHaveLength(1);
      expect(result.lastSessionDate?.toDateString()).toBe(baseDate.toDateString());
    });

    it('tracks multiple days without sorting', () => {
      const d10 = new Date(2025, 0, 10); // Jan 10, 2025 local time
      const d20 = new Date(2025, 0, 20); // Jan 20, 2025 local time
      const d15 = new Date(2025, 0, 15); // Jan 15, 2025 local time
      const tabRows = tabRowsWithSquat({
        squatMaxEffort: [
          rec(d10.getTime(), 'squat'),
          rec(d20.getTime(), 'squat'),
          rec(d15.getTime(), 'squat'),
        ],
      });
      const result = collectSessionDates(tabRows);
      expect(result.allSessionDates).toHaveLength(3);
      expect(result.lastSessionDate?.toDateString()).toBe(d20.toDateString());
    });

    it('combines dates from all lift types', () => {
      const d10 = new Date(2025, 0, 10);
      const d15 = new Date(2025, 0, 15);
      const d20 = new Date(2025, 0, 20);
      const tabRows = tabRowsWithMultiLifts({
        squat: {
          all: [],
          maxEffort: [rec(d10.getTime(), 'squat')],
          volume: [],
        },
        bench: {
          all: [],
          maxEffort: [rec(d15.getTime(), 'bench')],
          volume: [],
        },
        deadlift: {
          all: [],
          maxEffort: [rec(d20.getTime(), 'deadlift')],
          volume: [],
        },
        accessory: {
          all: [],
          maxEffort: [],
          volume: [],
        },
      });
      const result = collectSessionDates(tabRows);
      expect(result.allSessionDates).toHaveLength(3);
      expect(result.lastSessionDate?.toDateString()).toBe(d20.toDateString());
    });
  });

  describe('collectVolumeRecords', () => {
    it.each([
      ['no volume', emptyTabRows(), []],
      ['squat volume only', tabRowsWithSquat({ squatVolume: [rec(Date.now(), 'squat')] }), 1],
      [
        'all lifts contribute volume',
        tabRowsWithMultiLifts({
          squat: { all: [], maxEffort: [], volume: [rec(Date.now(), 'squat')] },
          bench: { all: [], maxEffort: [], volume: [rec(Date.now(), 'bench')] },
          deadlift: { all: [], maxEffort: [], volume: [rec(Date.now(), 'deadlift')] },
          accessory: { all: [], maxEffort: [], volume: [rec(Date.now(), 'accessory')] },
        }),
        4,
      ],
    ])('collects volume: %s', (_, tabRows, expectedCount) => {
      const result = collectVolumeRecords(tabRows);
      expect(result).toHaveLength(expectedCount as number);
    });
  });

  describe('defaultCanonicalsByLift', () => {
    it.each([
      ['no records', emptyTabRows(), 'sumo', {} as any],
      [
        'single lift with canonical',
        tabRowsWithSquat({
          squatAll: [rec(Date.now(), 'squat-comp', undefined, ['comp-lift'])],
        }),
        'sumo',
        { squat: 'squat-comp' } as any,
      ],
      [
        'multiple lifts mapped',
        tabRowsWithMultiLifts({
          squat: {
            all: [rec(Date.now(), 'squat-comp', undefined, ['comp-lift'])],
            maxEffort: [],
            volume: [],
          },
          bench: {
            all: [rec(Date.now(), 'bench-comp', undefined, ['comp-lift'])],
            maxEffort: [],
            volume: [],
          },
          deadlift: {
            all: [rec(Date.now(), 'deadlift-sumo', undefined, ['lift:deadlift'])],
            maxEffort: [],
            volume: [],
          },
          accessory: {
            all: [],
            maxEffort: [],
            volume: [],
          },
        }),
        'sumo',
        {
          squat: 'squat-comp',
          bench: 'bench-comp',
          deadlift: 'deadlift-sumo',
        } as any,
      ],
      [
        'deadlift stance preference passed to defaultCompExerciseCanonical',
        tabRowsWithSquat({
          squatAll: [],
        }),
        'conventional',
        {} as any,
      ],
    ])('defaults canonicals: %s', (_, tabRows, deadliftStance, expected) => {
      const result = defaultCanonicalsByLift(tabRows, deadliftStance);
      expect(result).toEqual(expected);
    });
  });

  describe('visibleLiftTypes', () => {
    const d10 = new Date(2025, 0, 10);
    const d15 = new Date(2025, 0, 15);
    const d20 = new Date(2025, 0, 20);
    const d25 = new Date(2025, 0, 25);

    it.each([
      ['no records', emptyTabRows(), undefined, undefined, []],
      [
        'all lifts visible without date filter',
        tabRowsWithMultiLifts({
          squat: {
            all: [rec(d10.getTime(), 'squat')],
            maxEffort: [],
            volume: [],
          },
          bench: {
            all: [rec(d15.getTime(), 'bench')],
            maxEffort: [],
            volume: [],
          },
          deadlift: {
            all: [rec(d20.getTime(), 'deadlift')],
            maxEffort: [],
            volume: [],
          },
          accessory: {
            all: [rec(d25.getTime(), 'accessory')],
            maxEffort: [],
            volume: [],
          },
        }),
        undefined,
        undefined,
        ['squat', 'bench', 'deadlift', 'accessory'],
      ],
      [
        'filter by from date (inclusive)',
        tabRowsWithMultiLifts({
          squat: {
            all: [rec(d10.getTime(), 'squat')],
            maxEffort: [],
            volume: [],
          },
          bench: {
            all: [rec(d15.getTime(), 'bench')],
            maxEffort: [],
            volume: [],
          },
          deadlift: {
            all: [rec(d20.getTime(), 'deadlift')],
            maxEffort: [],
            volume: [],
          },
          accessory: {
            all: [],
            maxEffort: [],
            volume: [],
          },
        }),
        d15,
        undefined,
        ['bench', 'deadlift'],
      ],
      [
        'filter by to date (inclusive to end-of-day)',
        tabRowsWithMultiLifts({
          squat: {
            all: [rec(d10.getTime(), 'squat')],
            maxEffort: [],
            volume: [],
          },
          bench: {
            all: [rec(d15.getTime(), 'bench')],
            maxEffort: [],
            volume: [],
          },
          deadlift: {
            all: [rec(d20.getTime(), 'deadlift')],
            maxEffort: [],
            volume: [],
          },
          accessory: {
            all: [],
            maxEffort: [],
            volume: [],
          },
        }),
        undefined,
        d15,
        ['squat', 'bench'],
      ],
      [
        'range at boundaries (exactly from and to)',
        tabRowsWithMultiLifts({
          squat: {
            all: [rec(d10.getTime(), 'squat')],
            maxEffort: [],
            volume: [],
          },
          bench: {
            all: [rec(d15.getTime(), 'bench')],
            maxEffort: [],
            volume: [],
          },
          deadlift: {
            all: [rec(d20.getTime(), 'deadlift')],
            maxEffort: [],
            volume: [],
          },
          accessory: {
            all: [],
            maxEffort: [],
            volume: [],
          },
        }),
        d10,
        d15,
        ['squat', 'bench'],
      ],
    ])('filters visible: %s', (_, tabRows, from, to, expected) => {
      const result = visibleLiftTypes(tabRows, from, to);
      expect(result).toEqual(expected as LiftType[]);
    });
  });
});
