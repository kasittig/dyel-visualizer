import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { LifterPipelineResult, Point } from '@dyel/api';
import type { PipelineModel, TaggedSetRecord } from '@dyel/pipeline';
import { useCoachViewSelection } from './useCoachViewSelection';

// Fixture factories

const point = (
  t: number,
  v: number,
  series: string = 'squat',
  tags: string[] = ['lift:squat']
): Point => ({
  t,
  v,
  series,
  tags: new Set(tags),
});

const taggedRecord = (
  canonical: string,
  exercise: string = 'Squat',
  overrides?: Partial<TaggedSetRecord>
): TaggedSetRecord => ({
  date: Date.now(),
  exercise,
  weight: 100,
  reps: 1,
  sets: 1,
  rpe: undefined,
  canonical,
  tags: new Set(['lift:squat']),
  effects: [],
  baselineRange: null,
  meta: { rawUnit: 'lbs' },
  ...overrides,
});

const minimalPipelineModel = (
  tagged: TaggedSetRecord[] = [],
  e1rmPoints: Point[] = [],
  e1rmMaxEffortPoints: Point[] = [],
  baseline: Record<string, string> = {}
): PipelineModel =>
  ({
    model: { baseline, variantFactor: {}, addlWtOffset: {} },
    diagnostics: { byCanonical: new Map(), allFindings: [] },
    unknownExercises: [],
    unnormalized: [],
    parseErrors: [],
    tagged,
    pointsByDeriver: new Map([
      ['e1rm', e1rmPoints],
      ['e1rm-max-effort', e1rmMaxEffortPoints],
    ]),
    pointsByLabelByDeriver: new Map(),
    pointsByDeriverAdjusted: new Map(),
    pointsByLabelByDeriverAdjusted: new Map(),
    athlete: { sex: 'M', bodyweight: 90 },
  }) as unknown as PipelineModel;

const successResult = (
  name: string,
  model: PipelineModel,
  url: string = 'http://example.com'
): LifterPipelineResult => ({
  status: 'success',
  name,
  url,
  model,
});

const errorResult = (
  name: string,
  url: string = 'http://example.com',
  message: string = 'Parse error'
): LifterPipelineResult => ({
  status: 'error',
  name,
  url,
  message,
});

describe('useCoachViewSelection', () => {
  describe('option dedup/sort', () => {
    it('deduplicates and sorts exercise options by display name, builds displayNameToCanonical map', () => {
      const model = minimalPipelineModel(
        [],
        [
          point(1, 100, 'squat'),
          point(1, 90, 'bench'),
          point(1, 85, 'squat'),
          point(1, 75, 'deadlift'),
        ]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter1', model)]));

      expect(result.current.exerciseOptions).toEqual(['Bench Press', 'Deadlift', 'Squat']);
      expect(result.current.displayNameToCanonical.get('Bench Press')).toBe('bench');
      expect(result.current.displayNameToCanonical.get('Deadlift')).toBe('deadlift');
      expect(result.current.displayNameToCanonical.get('Squat')).toBe('squat');
    });

    it('handles multiple lifters with overlapping and distinct canonicals', () => {
      const m1 = minimalPipelineModel([], [point(1, 100, 'squat'), point(1, 90, 'bench')]);
      const m2 = minimalPipelineModel([], [point(1, 85, 'bench'), point(1, 75, 'deadlift')]);
      const { result } = renderHook(() =>
        useCoachViewSelection([successResult('Lifter1', m1), successResult('Lifter2', m2)])
      );

      expect(result.current.exerciseOptions).toEqual(['Bench Press', 'Deadlift', 'Squat']);
    });
  });

  describe('placeholder rows by canonical', () => {
    it('shows a placeholder row for lifters with no e1rm points for selected canonical', () => {
      const { result } = renderHook(() =>
        useCoachViewSelection([
          successResult('SquatOnly', minimalPipelineModel([], [point(1, 100, 'squat')])),
          successResult('BenchOnly', minimalPipelineModel([], [point(1, 90, 'bench')])),
        ])
      );

      act(() => result.current.setSelectedDisplayName('Squat'));
      expect(result.current.rows).toHaveLength(2);
      expect(result.current.rows.find((r) => r.lifterName === 'SquatOnly')?.hasData).toBe(true);
      const bRow = result.current.rows.find((r) => r.lifterName === 'BenchOnly');
      expect(bRow?.hasData).toBe(false);
      expect(bRow?.lastPerformedDateDisplay).toBe('—');
      expect(bRow?.lastPerformedSetDisplay).toBe('No data logged');
      expect(bRow?.e1rmDisplay).toBe('—');
      expect(bRow?.e1rmProjectedDisplay).toBe(null);
      expect(bRow?.e1rmSourceLabel).toBe(null);
      expect(bRow?.sessionCount).toBe(0);

      act(() => result.current.setSelectedDisplayName('Bench Press'));
      expect(result.current.rows.find((r) => r.lifterName === 'SquatOnly')?.hasData).toBe(false);
      expect(result.current.rows.find((r) => r.lifterName === 'SquatOnly')?.sessionCount).toBe(0);
      expect(result.current.rows.find((r) => r.lifterName === 'BenchOnly')?.hasData).toBe(true);
    });

    it('shows a placeholder row for errored lifters', () => {
      const { result } = renderHook(() =>
        useCoachViewSelection([
          successResult('Lifter', minimalPipelineModel([], [point(1, 100, 'squat')])),
          errorResult('Broken'),
        ])
      );
      act(() => result.current.setSelectedDisplayName('Squat'));
      const brokenRow = result.current.rows.find((r) => r.lifterName === 'Broken');
      expect(brokenRow?.hasData).toBe(false);
      expect(brokenRow?.lastPerformedDateDisplay).toBe('—');
      expect(brokenRow?.lastPerformedSetDisplay).toBe('Failed to load');
      expect(brokenRow?.e1rmProjectedDisplay).toBe(null);
      expect(brokenRow?.e1rmSourceLabel).toBe(null);
      expect(brokenRow?.sessionCount).toBe(0);
    });

    it('returns empty rows when no canonical is selected', () => {
      const { result } = renderHook(() => useCoachViewSelection([]));
      expect(result.current.rows).toEqual([]);
    });
  });

  describe('default exercise selection', () => {
    it('auto-selects the first exercise option once options load', () => {
      const { result } = renderHook(() =>
        useCoachViewSelection([
          successResult(
            'Lifter',
            minimalPipelineModel([], [point(1, 100, 'squat'), point(1, 90, 'bench')])
          ),
        ])
      );
      expect(result.current.selectedDisplayName).toBe('Bench Press');
      expect(result.current.selectedCanonical).toBe('bench');
      expect(result.current.rows.length).toBeGreaterThan(0);
    });

    it('does not override an explicit user selection', () => {
      const lifters = [
        successResult(
          'Lifter',
          minimalPipelineModel([], [point(1, 100, 'squat'), point(1, 90, 'bench')])
        ),
      ];
      const { result, rerender } = renderHook((l) => useCoachViewSelection(l), {
        initialProps: lifters,
      });
      act(() => result.current.setSelectedDisplayName('Squat'));
      rerender(lifters);
      expect(result.current.selectedDisplayName).toBe('Squat');
    });

    it('stays unselected when there are no exercise options', () => {
      const { result } = renderHook(() => useCoachViewSelection([]));
      expect(result.current.selectedDisplayName).toBe('');
      expect(result.current.selectedCanonical).toBeNull();
    });
  });

  describe('reps-change recompute', () => {
    it('recomputes targetWeightDisplay when reps change', () => {
      const { result } = renderHook(() =>
        useCoachViewSelection([
          successResult('Lifter', minimalPipelineModel([], [point(1, 100, 'squat')])),
        ])
      );
      act(() => result.current.setSelectedDisplayName('Squat'));
      const initTarget = result.current.rows[0].targetWeightDisplay;
      expect(initTarget).toBeDefined();

      act(() => result.current.setReps(5));
      expect(result.current.rows[0].targetWeightDisplay).not.toBe(initTarget);
      expect(result.current.reps).toBe(5);
    });
  });

  describe('unit detection and display', () => {
    it('detects kg unit from first successful lifter', () => {
      const model = minimalPipelineModel(
        [taggedRecord('squat', 'Squat', { meta: { rawUnit: 'kg' } })],
        [point(1, 100, 'squat')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));
      expect(result.current.unit).toBe('kg');
    });

    it('falls back to lbs when all results are errors', () => {
      const { result } = renderHook(() =>
        useCoachViewSelection([errorResult('Error1'), errorResult('Error2')])
      );
      expect(result.current.unit).toBe('lbs');
    });

    it('uses first successful lifter unit detection order', () => {
      const m1 = minimalPipelineModel(
        [taggedRecord('squat', 'Squat', { meta: { rawUnit: 'lbs' } })],
        [point(1, 100, 'squat')]
      );
      const m2 = minimalPipelineModel(
        [taggedRecord('bench', 'Bench', { meta: { rawUnit: 'kg' } })],
        [point(1, 100, 'bench')]
      );
      const { result } = renderHook(() =>
        useCoachViewSelection([successResult('First', m1), successResult('Second', m2)])
      );
      expect(result.current.unit).toBe('lbs');
    });
  });

  describe('unit toggle', () => {
    const setup = () => {
      const model = minimalPipelineModel(
        [taggedRecord('squat', 'Squat', { meta: { rawUnit: 'kg' } })],
        [point(1, 100, 'squat')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));
      act(() => result.current.setSelectedDisplayName('Squat'));
      return result;
    };

    it('toggles unit and recomputes row display fields', () => {
      const res = setup();
      const [initE1rm, initTarget] = [
        res.current.rows[0].e1rmDisplay,
        res.current.rows[0].targetWeightDisplay,
      ];

      act(() => res.current.toggleUnit());
      expect(res.current.unit).toBe('lbs');
      expect(res.current.rows[0].e1rmDisplay).not.toBe(initE1rm);
      expect(res.current.rows[0].targetWeightDisplay).not.toBe(initTarget);
    });

    it('preserves detected unit on round-trip', () => {
      const res = setup();
      const [initE1rm, initTarget] = [
        res.current.rows[0].e1rmDisplay,
        res.current.rows[0].targetWeightDisplay,
      ];

      act(() => res.current.toggleUnit());
      expect(res.current.unit).toBe('lbs');

      act(() => res.current.toggleUnit());
      expect(res.current.unit).toBe('kg');
      expect(res.current.rows[0].e1rmDisplay).toBe(initE1rm);
      expect(res.current.rows[0].targetWeightDisplay).toBe(initTarget);
    });
  });

  describe('error count', () => {
    it.each([
      [
        'no errors',
        [successResult('L1', minimalPipelineModel()), successResult('L2', minimalPipelineModel())],
        0,
      ],
      ['single error', [errorResult('E1'), successResult('L1', minimalPipelineModel())], 1],
      ['all errors', [errorResult('E1'), errorResult('E2'), errorResult('E3')], 3],
      [
        'mixed',
        [
          successResult('L1', minimalPipelineModel()),
          errorResult('E1'),
          successResult('L2', minimalPipelineModel()),
          errorResult('E2'),
        ],
        2,
      ],
    ])('%s', (_, results, expectedCount) => {
      const { result } = renderHook(() => useCoachViewSelection(results));
      expect(result.current.erroredLifterCount).toBe(expectedCount);
    });
  });

  describe('selectedDisplayName to selectedCanonical resolution', () => {
    it('resolves selectedDisplayName to selectedCanonical', () => {
      const model = minimalPipelineModel(
        [],
        [point(1, 100, 'squat'), point(1, 90, 'bench'), point(1, 85, 'deadlift')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      expect(result.current.selectedDisplayName).toBe('Bench Press');
      expect(result.current.selectedCanonical).toBe('bench');

      act(() => result.current.setSelectedDisplayName('Deadlift'));
      expect(result.current.selectedDisplayName).toBe('Deadlift');
      expect(result.current.selectedCanonical).toBe('deadlift');

      act(() => result.current.setSelectedDisplayName('Nonexistent Exercise'));
      expect(result.current.selectedCanonical).toBeNull();
    });
  });

  describe('per-lifter overrides', () => {
    it('lets a per-lifter exercise override resolve independently for that row only', () => {
      const l1 = minimalPipelineModel([], [point(1, 100, 'squat'), point(1, 90, 'bench')]);
      const l2 = minimalPipelineModel([], [point(1, 150, 'squat'), point(1, 140, 'bench')]);
      const { result } = renderHook(() =>
        useCoachViewSelection([successResult('Alice', l1), successResult('Bob', l2)])
      );
      act(() => result.current.setSelectedDisplayName('Squat'));
      const aliceRow = () => result.current.rows.find((r) => r.lifterName === 'Alice')!;
      const bobRow = () => result.current.rows.find((r) => r.lifterName === 'Bob')!;

      act(() => aliceRow().onExerciseChange('Bench Press'));

      expect(aliceRow().effectiveDisplayName).toBe('Bench Press');
      expect(bobRow().effectiveDisplayName).toBe('Squat');
    });

    it('lets a per-lifter reps override resolve independently and only affects that row', () => {
      const l1 = minimalPipelineModel([], [point(1, 100, 'squat')]);
      const l2 = minimalPipelineModel([], [point(1, 150, 'squat')]);
      const { result } = renderHook(() =>
        useCoachViewSelection([successResult('Alice', l1), successResult('Bob', l2)])
      );
      act(() => result.current.setSelectedDisplayName('Squat'));
      const aliceRow = () => result.current.rows.find((r) => r.lifterName === 'Alice')!;
      const bobRow = () => result.current.rows.find((r) => r.lifterName === 'Bob')!;
      const bobInitialTarget = bobRow().targetWeightDisplay;

      act(() => aliceRow().onRepsChange(5));

      expect(aliceRow().effectiveReps).toBe(5);
      expect(bobRow().effectiveReps).toBe(1);
      expect(bobRow().targetWeightDisplay).toBe(bobInitialTarget);
    });

    it('setSelectedDisplayName clears exercise overrides but reps overrides survive', () => {
      const model = minimalPipelineModel(
        [],
        [point(1, 100, 'squat'), point(1, 90, 'bench'), point(1, 80, 'deadlift')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Alice', model)]));
      act(() => result.current.setSelectedDisplayName('Squat'));
      act(() => result.current.rows[0].onExerciseChange('Bench Press'));
      act(() => result.current.rows[0].onRepsChange(7));
      act(() => result.current.setSelectedDisplayName('Deadlift'));

      expect(result.current.rows[0].effectiveDisplayName).toBe('Deadlift');
      expect(result.current.rows[0].effectiveReps).toBe(7);
    });

    it('setReps clears reps overrides but exercise overrides survive', () => {
      const model = minimalPipelineModel(
        [],
        [point(1, 100, 'squat'), point(1, 90, 'bench'), point(1, 80, 'deadlift')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Alice', model)]));
      act(() => result.current.setSelectedDisplayName('Squat'));
      act(() => result.current.rows[0].onExerciseChange('Bench Press'));
      act(() => result.current.rows[0].onRepsChange(7));
      act(() => result.current.setReps(3));

      expect(result.current.rows[0].effectiveDisplayName).toBe('Bench Press');
      expect(result.current.rows[0].effectiveReps).toBe(3);
    });

    it('a per-lifter override with no matching data placeholders only that row', () => {
      const l1 = minimalPipelineModel([], [point(1, 100, 'squat')]);
      const l2 = minimalPipelineModel([], [point(1, 150, 'squat')]);
      const { result } = renderHook(() =>
        useCoachViewSelection([successResult('Alice', l1), successResult('Bob', l2)])
      );
      act(() => result.current.setSelectedDisplayName('Squat'));
      const aliceRow = () => result.current.rows.find((r) => r.lifterName === 'Alice')!;
      const bobRow = () => result.current.rows.find((r) => r.lifterName === 'Bob')!;

      act(() => aliceRow().onExerciseChange('Bench Press'));

      expect(aliceRow().hasData).toBe(false);
      expect(aliceRow().lastPerformedDateDisplay).toBe('—');
      expect(aliceRow().lastPerformedSetDisplay).toBe('No data logged');
      expect(bobRow().hasData).toBe(true);
    });
  });

  describe('sessionCount computation', () => {
    it('counts distinct session dates for selected canonical', () => {
      const date1 = 1000000000;
      const date2 = 2000000000;
      const date3 = 3000000000;
      const model = minimalPipelineModel(
        [
          taggedRecord('squat', 'Squat', { date: date1 }),
          taggedRecord('squat', 'Squat', { date: date1 }),
          taggedRecord('squat', 'Squat', { date: date2 }),
          taggedRecord('squat', 'Squat', { date: date3 }),
        ],
        [point(1, 100, 'squat')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      act(() => result.current.setSelectedDisplayName('Squat'));
      expect(result.current.rows[0].sessionCount).toBe(3);
    });

    it('reflects sessionCount based on per-lifter exercise override', () => {
      const date1 = 1000000000;
      const date2 = 2000000000;
      const squat3Dates = [
        taggedRecord('squat', 'Squat', { date: date1 }),
        taggedRecord('squat', 'Squat', { date: date2 }),
        taggedRecord('squat', 'Squat', { date: 3000000000 }),
      ];
      const bench2Dates = [
        taggedRecord('bench', 'Bench', { date: date1 }),
        taggedRecord('bench', 'Bench', { date: date2 }),
      ];
      const model = minimalPipelineModel(
        [...squat3Dates, ...bench2Dates],
        [point(1, 100, 'squat'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      act(() => result.current.setSelectedDisplayName('Squat'));
      expect(result.current.rows[0].sessionCount).toBe(3);

      act(() => result.current.rows[0].onExerciseChange('Bench Press'));
      expect(result.current.rows[0].sessionCount).toBe(2);
    });
  });

  describe('e1RM projection', () => {
    it.each([
      ['no baseline configured', [], {}, null, null],
      [
        'baseline configured with exact e1rm-max-effort match',
        [point(1, 150, 'squat')],
        { 'lift:squat': 'squat' },
        'squat',
        'Based on',
      ],
    ])('%s', (_, e1rmMaxEffortPoints, baseline, expectedCanonical, expectedLabelPrefix) => {
      const model = minimalPipelineModel(
        [taggedRecord('squat', 'Squat', { weight: 150 })],
        [point(1, 100, 'squat')],
        e1rmMaxEffortPoints,
        baseline
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      act(() => result.current.setSelectedDisplayName('Squat'));
      const row = result.current.rows[0];

      if (expectedCanonical === null) {
        expect(row.e1rmProjectedDisplay).toBe(null);
        expect(row.e1rmSourceLabel).toBe(null);
      } else {
        expect(row.e1rmProjectedDisplay).not.toBeNull();
        expect(typeof row.e1rmProjectedDisplay).toBe('string');
        expect(row.e1rmSourceLabel).toBeDefined();
        expect(row.e1rmSourceLabel?.startsWith(expectedLabelPrefix)).toBe(true);
      }
    });
  });

  describe('availableExerciseOptions filtering', () => {
    it.each([
      [
        'subset filtering: lifter has some but not all exercises',
        [
          successResult(
            'L1',
            minimalPipelineModel([], [point(1, 100, 'squat'), point(1, 90, 'bench')])
          ),
          successResult(
            'L2',
            minimalPipelineModel([], [point(1, 110, 'bench'), point(1, 105, 'deadlift')])
          ),
        ],
        { L1: ['Bench Press', 'Squat'], L2: ['Bench Press', 'Deadlift'] },
      ],
      [
        'empty list: lifter has no e1rm data at all',
        [
          successResult('L1', minimalPipelineModel([], [point(1, 100, 'squat')])),
          successResult('L2', minimalPipelineModel([], [])),
        ],
        { L1: ['Squat'], L2: [] },
      ],
      [
        'error fallback: errored lifter gets full exerciseOptions',
        [
          successResult(
            'L1',
            minimalPipelineModel([], [point(1, 100, 'squat'), point(1, 90, 'bench')])
          ),
          errorResult('L2'),
        ],
        { L1: ['Bench Press', 'Squat'], L2: ['Bench Press', 'Squat'] },
      ],
    ])('%s', (_, results, expectedByLifter) => {
      const { result } = renderHook(() => useCoachViewSelection(results));

      // Set a canonical to populate rows
      if (result.current.exerciseOptions.length > 0) {
        act(() => result.current.setSelectedDisplayName(result.current.exerciseOptions[0]));
      }

      for (const [lifterName, expected] of Object.entries(expectedByLifter)) {
        const row = result.current.rows.find((r) => r.lifterName === lifterName);
        expect(row?.availableExerciseOptions).toEqual(expected);
      }
    });
  });

  describe('facet filtering', () => {
    it('defaults to unfiltered exerciseOptions when no facet is selected', () => {
      const model = minimalPipelineModel(
        [
          taggedRecord('squat-ssb', 'Squat', { tags: new Set(['bar:ssb']) }),
          taggedRecord('bench', 'Bench', { tags: new Set(['bar:standard']) }),
        ],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      expect(result.current.exerciseOptions).toEqual(['Bench Press', 'SSB Squat']);
    });

    it('narrows exerciseOptions to canonicals matching the selected bar facet', () => {
      const model = minimalPipelineModel(
        [
          taggedRecord('squat-ssb', 'Squat', { tags: new Set(['bar:ssb']) }),
          taggedRecord('bench', 'Bench', { tags: new Set(['bar:standard']) }),
        ],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      act(() => result.current.setSelectedBar('ssb'));

      expect(result.current.exerciseOptions).toEqual(['SSB Squat']);
    });

    it('clearing the facet (setting back to null) restores the full list', () => {
      const model = minimalPipelineModel(
        [
          taggedRecord('squat-ssb', 'Squat', { tags: new Set(['bar:ssb']) }),
          taggedRecord('bench', 'Bench', { tags: new Set(['bar:standard']) }),
        ],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      act(() => result.current.setSelectedBar('ssb'));
      expect(result.current.exerciseOptions).toEqual(['SSB Squat']);

      act(() => result.current.setSelectedBar(null));
      expect(result.current.exerciseOptions).toEqual(['Bench Press', 'SSB Squat']);
    });

    it('narrows a row availableExerciseOptions the same way as exerciseOptions', () => {
      const model = minimalPipelineModel(
        [
          taggedRecord('squat-ssb', 'Squat', { tags: new Set(['bar:ssb']) }),
          taggedRecord('bench', 'Bench', { tags: new Set(['bar:standard']) }),
        ],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));
      act(() => result.current.setSelectedDisplayName('SSB Squat'));

      act(() => result.current.setSelectedBar('ssb'));

      expect(result.current.rows[0].availableExerciseOptions).toEqual(['SSB Squat']);
    });

    it('resets the top-level explicit exercise selection when a facet changes', () => {
      const model = minimalPipelineModel(
        [
          taggedRecord('squat-ssb', 'Squat', { tags: new Set(['bar:ssb']) }),
          taggedRecord('bench', 'Bench', { tags: new Set(['bar:standard']) }),
        ],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));
      act(() => result.current.setSelectedDisplayName('Bench Press'));
      expect(result.current.selectedDisplayName).toBe('Bench Press');

      act(() => result.current.setSelectedBar('ssb'));

      // 'Bench Press' no longer matches the ssb filter, so the default re-derives to the first
      // remaining option ('SSB Squat') rather than staying pinned to a filtered-out selection.
      expect(result.current.selectedDisplayName).toBe('SSB Squat');
    });

    it('does not clear a per-lifter override when a top-level facet changes', () => {
      const model = minimalPipelineModel(
        [
          taggedRecord('squat-ssb', 'Squat', { tags: new Set(['bar:ssb']) }),
          taggedRecord('bench', 'Bench', { tags: new Set(['bar:standard']) }),
        ],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));
      act(() => result.current.setSelectedDisplayName('Bench Press'));
      act(() => result.current.rows[0].onExerciseChange('SSB Squat'));
      expect(result.current.rows[0].effectiveDisplayName).toBe('SSB Squat');

      act(() => result.current.setSelectedBar('ssb'));

      expect(result.current.rows[0].effectiveDisplayName).toBe('SSB Squat');
    });
  });

  describe('lift type filtering', () => {
    it('defaults to unfiltered exerciseOptions when no lift type is selected', () => {
      const model = minimalPipelineModel(
        [taggedRecord('squat-ssb', 'Squat'), taggedRecord('bench', 'Bench')],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      expect(result.current.exerciseOptions).toEqual(['Bench Press', 'SSB Squat']);
    });

    it('narrows exerciseOptions to canonicals matching the selected lift type', () => {
      const model = minimalPipelineModel(
        [taggedRecord('squat-ssb', 'Squat'), taggedRecord('bench', 'Bench')],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      act(() => result.current.setSelectedLiftType('squat'));

      expect(result.current.exerciseOptions).toEqual(['SSB Squat']);
    });

    it('clearing the lift type (setting back to null) restores the full list', () => {
      const model = minimalPipelineModel(
        [taggedRecord('squat-ssb', 'Squat'), taggedRecord('bench', 'Bench')],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      act(() => result.current.setSelectedLiftType('squat'));
      expect(result.current.exerciseOptions).toEqual(['SSB Squat']);

      act(() => result.current.setSelectedLiftType(null));
      expect(result.current.exerciseOptions).toEqual(['Bench Press', 'SSB Squat']);
    });

    it('narrows a row availableExerciseOptions the same way as exerciseOptions', () => {
      const model = minimalPipelineModel(
        [taggedRecord('squat-ssb', 'Squat'), taggedRecord('bench', 'Bench')],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));
      act(() => result.current.setSelectedDisplayName('SSB Squat'));

      act(() => result.current.setSelectedLiftType('squat'));

      expect(result.current.rows[0].availableExerciseOptions).toEqual(['SSB Squat']);
    });

    it('resets the top-level explicit exercise selection when the lift type changes', () => {
      const model = minimalPipelineModel(
        [taggedRecord('squat-ssb', 'Squat'), taggedRecord('bench', 'Bench')],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));
      act(() => result.current.setSelectedDisplayName('Bench Press'));
      expect(result.current.selectedDisplayName).toBe('Bench Press');

      act(() => result.current.setSelectedLiftType('squat'));

      // 'Bench' no longer matches the squat filter, so the default re-derives to the first
      // remaining option ('SSB Squat') rather than staying pinned to a filtered-out selection.
      expect(result.current.selectedDisplayName).toBe('SSB Squat');
    });

    it('does not clear a per-lifter override when the lift type changes', () => {
      const model = minimalPipelineModel(
        [taggedRecord('squat-ssb', 'Squat'), taggedRecord('bench', 'Bench')],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));
      act(() => result.current.setSelectedDisplayName('Bench Press'));
      act(() => result.current.rows[0].onExerciseChange('SSB Squat'));
      expect(result.current.rows[0].effectiveDisplayName).toBe('SSB Squat');

      act(() => result.current.setSelectedLiftType('squat'));

      expect(result.current.rows[0].effectiveDisplayName).toBe('SSB Squat');
    });

    it('liftTypeOptions only includes lift types actually present in the loaded data', () => {
      const model = minimalPipelineModel(
        [taggedRecord('squat-ssb', 'Squat'), taggedRecord('bench', 'Bench')],
        [point(1, 100, 'squat-ssb'), point(1, 90, 'bench')]
      );
      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      expect(result.current.liftTypeOptions).toEqual(['squat', 'bench']);
    });
  });

  describe('integration: full workflow', () => {
    it('handles multi-lifter coach selection workflow', () => {
      const l1Model = minimalPipelineModel(
        [taggedRecord('squat', 'Squat', { meta: { rawUnit: 'kg' } })],
        [point(1, 140, 'squat'), point(1, 120, 'bench')]
      );
      const l2Model = minimalPipelineModel(
        [taggedRecord('bench', 'Bench', { meta: { rawUnit: 'lbs' } })],
        [point(1, 300, 'bench'), point(1, 250, 'deadlift')]
      );

      const { result } = renderHook(() =>
        useCoachViewSelection([successResult('Alice', l1Model), successResult('Bob', l2Model)])
      );

      expect(result.current.unit).toBe('kg');
      expect(result.current.exerciseOptions.length).toBeGreaterThanOrEqual(2);

      act(() => result.current.setSelectedDisplayName('Bench Press'));
      expect(result.current.rows.some((r) => r.lifterName === 'Alice')).toBe(true);
      expect(result.current.rows.some((r) => r.lifterName === 'Bob')).toBe(true);

      const initialRows = result.current.rows;
      act(() => result.current.setReps(3));
      expect(result.current.rows[0].targetWeightDisplay).not.toBe(
        initialRows[0].targetWeightDisplay
      );

      act(() => result.current.toggleUnit());
      expect(result.current.unit).toBe('lbs');
      expect(result.current.rows[0].e1rmDisplay).not.toBe(initialRows[0].e1rmDisplay);
    });
  });
});
