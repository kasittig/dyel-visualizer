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
  e1rmPoints: Point[] = []
): PipelineModel =>
  ({
    model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
    diagnostics: { byCanonical: new Map(), allFindings: [] },
    unknownExercises: [],
    unnormalized: [],
    parseErrors: [],
    tagged,
    pointsByDeriver: new Map([['e1rm', e1rmPoints]]),
    pointsByLabelByDeriver: new Map(),
    pointsByDeriverAdjusted: new Map(),
    pointsByLabelByDeriverAdjusted: new Map(),
    athlete: { sex: 'M', bodyweight: 90, deadliftStance: 'sumo' },
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
          point(1, 85, 'squat'), // duplicate canonical
          point(1, 75, 'deadlift'),
        ]
      );

      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter1', model)]));

      // Verify dedup: only 3 unique canonicals
      expect(result.current.exerciseOptions).toHaveLength(3);

      // Verify sorted by display name: Bench Press, Deadlift, Squat
      expect(result.current.exerciseOptions).toEqual(['Bench Press', 'Deadlift', 'Squat']);

      // Verify displayNameToCanonical map
      expect(result.current.displayNameToCanonical.get('Bench Press')).toBe('bench');
      expect(result.current.displayNameToCanonical.get('Deadlift')).toBe('deadlift');
      expect(result.current.displayNameToCanonical.get('Squat')).toBe('squat');
    });

    it('handles multiple lifters with overlapping and distinct canonicals', () => {
      const model1 = minimalPipelineModel([], [point(1, 100, 'squat'), point(1, 90, 'bench')]);
      const model2 = minimalPipelineModel([], [point(1, 85, 'bench'), point(1, 75, 'deadlift')]);

      const { result } = renderHook(() =>
        useCoachViewSelection([successResult('Lifter1', model1), successResult('Lifter2', model2)])
      );

      // Union of canonicals: bench, deadlift, squat
      expect(result.current.exerciseOptions).toEqual(['Bench Press', 'Deadlift', 'Squat']);
      expect(result.current.exerciseOptions).toHaveLength(3);
    });
  });

  describe('placeholder rows by canonical', () => {
    it('shows a placeholder row for lifters with no e1rm points for selected canonical', () => {
      const model1 = minimalPipelineModel([], [point(1, 100, 'squat')]);
      const model2 = minimalPipelineModel([], [point(1, 90, 'bench')]);

      const { result } = renderHook(() =>
        useCoachViewSelection([
          successResult('SquatOnly', model1),
          successResult('BenchOnly', model2),
        ])
      );

      // Select Squat
      act(() => {
        result.current.setSelectedDisplayName('Squat');
      });

      // Both lifters appear; BenchOnly is a placeholder row
      expect(result.current.rows).toHaveLength(2);
      const squatOnlyRow = result.current.rows.find((r) => r.lifterName === 'SquatOnly');
      const benchOnlyRow = result.current.rows.find((r) => r.lifterName === 'BenchOnly');
      expect(squatOnlyRow?.hasData).toBe(true);
      expect(benchOnlyRow?.hasData).toBe(false);
      expect(benchOnlyRow?.lastPerformedDisplay).toBe('No data logged');
      expect(benchOnlyRow?.e1rmDisplay).toBe('—');

      // Select Bench
      act(() => {
        result.current.setSelectedDisplayName('Bench Press');
      });

      // Both lifters still appear; SquatOnly is now the placeholder row
      expect(result.current.rows).toHaveLength(2);
      expect(result.current.rows.find((r) => r.lifterName === 'SquatOnly')?.hasData).toBe(false);
      expect(result.current.rows.find((r) => r.lifterName === 'BenchOnly')?.hasData).toBe(true);
    });

    it('shows a placeholder row for errored lifters', () => {
      const model = minimalPipelineModel([], [point(1, 100, 'squat')]);

      const { result } = renderHook(() =>
        useCoachViewSelection([successResult('Lifter', model), errorResult('Broken')])
      );

      act(() => {
        result.current.setSelectedDisplayName('Squat');
      });

      const brokenRow = result.current.rows.find((r) => r.lifterName === 'Broken');
      expect(brokenRow?.hasData).toBe(false);
      expect(brokenRow?.lastPerformedDisplay).toBe('Failed to load');
    });

    it('returns empty rows when no canonical is selected', () => {
      const { result } = renderHook(() => useCoachViewSelection([]));

      expect(result.current.rows).toEqual([]);
    });
  });

  describe('default exercise selection', () => {
    it('auto-selects the first exercise option once options load', () => {
      const model = minimalPipelineModel([], [point(1, 100, 'squat'), point(1, 90, 'bench')]);

      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      expect(result.current.selectedDisplayName).toBe('Bench Press');
      expect(result.current.selectedCanonical).toBe('bench');
      expect(result.current.rows.length).toBeGreaterThan(0);
    });

    it('does not override an explicit user selection', () => {
      const model = minimalPipelineModel([], [point(1, 100, 'squat'), point(1, 90, 'bench')]);

      const { result, rerender } = renderHook((lifters) => useCoachViewSelection(lifters), {
        initialProps: [successResult('Lifter', model)],
      });

      act(() => {
        result.current.setSelectedDisplayName('Squat');
      });

      rerender([successResult('Lifter', model)]);

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
      const model = minimalPipelineModel([], [point(1, 100, 'squat')]); // 100 kg e1rm

      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      act(() => {
        result.current.setSelectedDisplayName('Squat');
      });

      const initialTarget = result.current.rows[0].targetWeightDisplay;

      // Default reps is 1, so target should be ~100 lbs (since unit defaults to lbs)
      expect(initialTarget).toBeDefined();

      // Change reps to 5
      act(() => {
        result.current.setReps(5);
      });

      const newTarget = result.current.rows[0].targetWeightDisplay;

      // Target should be different (lighter weight for more reps)
      expect(newTarget).not.toBe(initialTarget);
      expect(result.current.reps).toBe(5);
    });
  });

  describe('unit detection and display', () => {
    it('detects kg unit from first successful lifter with meta.rawUnit === "kg"', () => {
      const rec = taggedRecord('squat', 'Squat', { meta: { rawUnit: 'kg' } });
      const model = minimalPipelineModel([rec], [point(1, 100, 'squat')]);

      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      expect(result.current.unit).toBe('kg');
    });

    it('falls back to lbs when all results are errors', () => {
      const { result } = renderHook(() =>
        useCoachViewSelection([errorResult('Error1'), errorResult('Error2')])
      );

      expect(result.current.unit).toBe('lbs');
    });

    it('uses first successful lifter unit detection order (iterates LIFT_TABS)', () => {
      // Model with lbs unit
      const recLbs = taggedRecord('squat', 'Squat', { meta: { rawUnit: 'lbs' } });
      const model1 = minimalPipelineModel([recLbs], [point(1, 100, 'squat')]);

      // Model with kg unit
      const recKg = taggedRecord('bench', 'Bench', { meta: { rawUnit: 'kg' } });
      const model2 = minimalPipelineModel([recKg], [point(1, 100, 'bench')]);

      const { result } = renderHook(() =>
        useCoachViewSelection([successResult('First', model1), successResult('Second', model2)])
      );

      // First successful lifter (First) has lbs
      expect(result.current.unit).toBe('lbs');
    });
  });

  describe('unit toggle', () => {
    it('toggles unit and recomputes row display fields', () => {
      const rec = taggedRecord('squat', 'Squat', { meta: { rawUnit: 'kg' } });
      const model = minimalPipelineModel([rec], [point(1, 100, 'squat')]);

      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      act(() => {
        result.current.setSelectedDisplayName('Squat');
      });

      const initialUnit = result.current.unit;
      const initialE1rm = result.current.rows[0].e1rmDisplay;
      const initialTarget = result.current.rows[0].targetWeightDisplay;

      // Toggle unit
      act(() => {
        result.current.toggleUnit();
      });

      expect(result.current.unit).not.toBe(initialUnit);
      expect(result.current.unit).toBe(initialUnit === 'kg' ? 'lbs' : 'kg');

      // Display values should change
      const newE1rm = result.current.rows[0].e1rmDisplay;
      const newTarget = result.current.rows[0].targetWeightDisplay;

      expect(newE1rm).not.toBe(initialE1rm);
      expect(newTarget).not.toBe(initialTarget);
    });

    it('toggle preserves detected unit on round-trip (toggle from kg to lbs back to kg)', () => {
      const rec = taggedRecord('squat', 'Squat', { meta: { rawUnit: 'kg' } });
      const model = minimalPipelineModel([rec], [point(1, 100, 'squat')]);

      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      act(() => {
        result.current.setSelectedDisplayName('Squat');
      });

      const initialE1rm = result.current.rows[0].e1rmDisplay;
      const initialTarget = result.current.rows[0].targetWeightDisplay;

      // Toggle to lbs
      act(() => {
        result.current.toggleUnit();
      });
      expect(result.current.unit).toBe('lbs');
      expect(result.current.rows[0].e1rmDisplay).not.toBe(initialE1rm);

      // Toggle back to kg
      act(() => {
        result.current.toggleUnit();
      });

      expect(result.current.unit).toBe('kg'); // Back to original
      expect(result.current.rows[0].e1rmDisplay).toBe(initialE1rm); // Same value
      expect(result.current.rows[0].targetWeightDisplay).toBe(initialTarget); // Same value
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
    it('resolves selectedDisplayName to selectedCanonical via displayNameToCanonical map', () => {
      const model = minimalPipelineModel(
        [],
        [point(1, 100, 'squat'), point(1, 90, 'bench'), point(1, 85, 'deadlift')]
      );

      const { result } = renderHook(() => useCoachViewSelection([successResult('Lifter', model)]));

      // Auto-selected to the first option ('Bench Press') once options loaded
      expect(result.current.selectedDisplayName).toBe('Bench Press');
      expect(result.current.selectedCanonical).toBe('bench');

      // Set to 'Bench Press' explicitly (no-op, already selected)
      act(() => {
        result.current.setSelectedDisplayName('Bench Press');
      });

      expect(result.current.selectedDisplayName).toBe('Bench Press');
      expect(result.current.selectedCanonical).toBe('bench');

      // Set to 'Deadlift'
      act(() => {
        result.current.setSelectedDisplayName('Deadlift');
      });

      expect(result.current.selectedDisplayName).toBe('Deadlift');
      expect(result.current.selectedCanonical).toBe('deadlift');

      // Invalid display name yields null canonical
      act(() => {
        result.current.setSelectedDisplayName('Nonexistent Exercise');
      });

      expect(result.current.selectedCanonical).toBeNull();
    });
  });

  describe('integration: full workflow', () => {
    it('handles realistic multi-lifter coach selection workflow', () => {
      // Two lifters: one kg-native, one lbs-native
      const lifter1Rec = taggedRecord('squat', 'Squat', { meta: { rawUnit: 'kg' } });
      const lifter1Model = minimalPipelineModel(
        [lifter1Rec],
        [point(1, 140, 'squat'), point(1, 120, 'bench')]
      );

      const lifter2Rec = taggedRecord('bench', 'Bench', { meta: { rawUnit: 'lbs' } });
      const lifter2Model = minimalPipelineModel(
        [lifter2Rec],
        [point(1, 300, 'bench'), point(1, 250, 'deadlift')]
      );

      const { result } = renderHook(() =>
        useCoachViewSelection([
          successResult('Alice', lifter1Model),
          successResult('Bob', lifter2Model),
        ])
      );

      // Should detect kg from first lifter (Alice)
      expect(result.current.unit).toBe('kg');

      // Options should include squat, bench, deadlift
      expect(result.current.exerciseOptions.length).toBeGreaterThanOrEqual(2);

      // Select bench
      act(() => {
        result.current.setSelectedDisplayName('Bench Press');
      });

      // Both lifters have bench data
      expect(result.current.rows.length).toBeGreaterThan(0);

      const benchRows = result.current.rows;
      expect(benchRows.some((r) => r.lifterName === 'Alice')).toBe(true);
      expect(benchRows.some((r) => r.lifterName === 'Bob')).toBe(true);

      // Set reps to 3
      act(() => {
        result.current.setReps(3);
      });

      const rowsAfterRepsChange = result.current.rows;
      expect(rowsAfterRepsChange[0].targetWeightDisplay).not.toBe(benchRows[0].targetWeightDisplay);

      // Toggle to lbs and verify rows update
      act(() => {
        result.current.toggleUnit();
      });

      expect(result.current.unit).toBe('lbs');
      const rowsAfterUnitToggle = result.current.rows;
      expect(rowsAfterUnitToggle[0].e1rmDisplay).not.toBe(benchRows[0].e1rmDisplay);
    });
  });
});
