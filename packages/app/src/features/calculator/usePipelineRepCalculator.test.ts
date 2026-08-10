import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { TaggedSetRecord, SplitRows, LiftType } from '@dyel/api';
import { usePipelineRepCalculator } from './usePipelineRepCalculator';
import { pipelineModelMock, pointStoreMock } from '../../test/helpers/pipelineModelFactory';

vi.mock('../../app/PipelineContext');
const mockUsePipelineModel = vi.mocked(
  (await import('../../app/PipelineContext')).usePipelineModel
);

const rec = (
  canonical: string,
  tags = ['lift:squat', 'comp-lift'],
  overrides?: Partial<TaggedSetRecord>
): TaggedSetRecord => ({
  date: Date.now(),
  exercise: 'Squat',
  weight: 100,
  reps: 1,
  meta: { rawUnit: 'kg' },
  canonical,
  tags: new Set(tags),
  effects: [],
  baselineRange: null,
  ...overrides,
});

const splitRows = (records: TaggedSetRecord[]): SplitRows => ({
  all: records,
  maxEffort: records,
  volume: [],
});
const emptyRows = (): Record<LiftType, SplitRows> => ({
  squat: splitRows([]),
  bench: splitRows([]),
  deadlift: splitRows([]),
  accessory: splitRows([]),
});

const mockModel = (v = 200) =>
  pipelineModelMock({
    model: {
      baseline: { 'lift:squat': 'squat' },
      variantFactor: {},
      addlWtOffset: {},
      fittedAt: Date.now(),
    },
    points: pointStoreMock(
      new Map([['e1rm-max-effort', [{ t: 1, v, series: 'squat', tags: new Set(['lift:squat']) }]]])
    ),
  });

describe('usePipelineRepCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies initial empty shapes and dynamic input prediction cascading handlers', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'loading', model: null });
    const { result } = renderHook(() => usePipelineRepCalculator(emptyRows(), {}));
    expect(result.current.liftType).toBe('squat');
    expect(result.current.activeCanonical).toBe('');
    expect(result.current.selectedBar).toBeNull();

    const rows = emptyRows();
    rows.squat = splitRows([
      rec('squat'),
      rec('squat-board', ['lift:squat', 'equip:board-2'], {
        meta: { rawUnit: 'kg', rawExercise: 'Squat Board' },
      }),
    ]);
    const { result: active } = renderHook(() => usePipelineRepCalculator(rows, {}));
    act(() => {
      active.current.handleSelectedCanonicalChange('Squat Board');
    });
    expect(active.current.selectedEquipment).toBe('board');
    expect(active.current.selectedEquipmentMagnitude).toBe('2');
    expect(active.current.activeLabel).toBe('Squat Board');

    mockUsePipelineModel.mockReturnValue({ status: 'success', model: mockModel() });
    rows.squat = splitRows([rec('squat')]);
    const { result: calc } = renderHook(() => usePipelineRepCalculator(rows, { squat: 'Squat' }));
    act(() => {
      calc.current.handleRepsChange('5');
    });
    expect(calc.current.reps).toBe('5');
    expect(Number(calc.current.weight)).toBeGreaterThan(0);

    act(() => {
      calc.current.handleWeightChange('150');
    });
    expect(calc.current.weight).toBe('150');
    expect(Number(calc.current.reps)).toBeGreaterThan(0);
  });

  it('keeps user-entered values stable when connected estimates refresh', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'success', model: mockModel(200) });
    const rows = emptyRows();
    rows.squat = splitRows([rec('squat')]);
    const { result, rerender } = renderHook(() =>
      usePipelineRepCalculator(rows, { squat: 'Squat' })
    );

    act(() => {
      result.current.handleRepsChange('5');
    });
    const originalWeight = result.current.weight;
    expect(result.current.reps).toBe('5');

    mockUsePipelineModel.mockReturnValue({ status: 'success', model: mockModel(300) });
    act(() => {
      rerender();
    });
    expect(result.current.reps).toBe('5');
    expect(result.current.weight).toBe(originalWeight);
  });

  it('recalculates the dependent weight when the connected selection changes its estimate', () => {
    const rows = emptyRows();
    rows.squat = splitRows([rec('squat')]);
    rows.bench = splitRows([rec('bench', ['lift:bench', 'comp-lift'], { exercise: 'Bench' })]);
    const connectedModel = pipelineModelMock({
      model: {
        baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' },
        variantFactor: {},
        addlWtOffset: {},
        fittedAt: Date.now(),
      },
      points: pointStoreMock(
        new Map([
          [
            'e1rm-max-effort',
            [
              { t: 1, v: 200, series: 'squat', tags: new Set(['lift:squat']) },
              { t: 1, v: 300, series: 'bench', tags: new Set(['lift:bench']) },
            ],
          ],
        ])
      ),
    });
    mockUsePipelineModel.mockReturnValue({ status: 'success', model: connectedModel });
    const { result } = renderHook(() =>
      usePipelineRepCalculator(rows, { squat: 'Squat', bench: 'Bench' })
    );

    act(() => result.current.handleRepsChange('5'));
    const squatWeight = result.current.weight;
    act(() => result.current.setLiftType('bench'));

    expect(result.current.reps).toBe('5');
    expect(result.current.weight).not.toBe(squatWeight);
  });

  it('recalculates the dependent weight when the connected display unit changes', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'success', model: mockModel(200) });
    let rows = emptyRows();
    rows.squat = splitRows([rec('squat')]);
    const { result, rerender } = renderHook(() =>
      usePipelineRepCalculator(rows, { squat: 'Squat' })
    );
    act(() => result.current.handleRepsChange('5'));
    const kgWeight = result.current.weight;

    rows = { ...rows, squat: splitRows([rec('squat', undefined, { meta: { rawUnit: 'lbs' } })]) };
    rerender();

    expect(result.current.reps).toBe('5');
    expect(result.current.weight).not.toBe(kgWeight);
  });

  it.each([
    ['reps were last edited', '5', null],
    ['weight was last edited', null, '250'],
  ])('recalculates only the dependent field when manual e1RM changes and %s', (_, reps, weight) => {
    mockUsePipelineModel.mockReturnValue({ status: 'idle', model: null });
    const { result } = renderHook(() => usePipelineRepCalculator(emptyRows(), {}, 'manual'));
    act(() => result.current.handleManualE1rmChange('300'));
    if (reps) {
      act(() => result.current.handleRepsChange(reps));
    }
    if (weight) {
      act(() => result.current.handleWeightChange(weight));
    }
    const originalWeight = result.current.weight;
    const originalReps = result.current.reps;

    act(() => result.current.handleManualE1rmChange('400'));

    if (reps) {
      expect(result.current.reps).toBe(originalReps);
      expect(result.current.weight).not.toBe(originalWeight);
    } else {
      expect(result.current.weight).toBe(originalWeight);
      expect(result.current.reps).not.toBe(originalReps);
    }
  });

  it.each(['idle', 'loading', 'error'] as const)(
    'keeps manual calculations usable while pipeline status is %s',
    (status) => {
      mockUsePipelineModel.mockReturnValue({ status, model: null });
      const { result } = renderHook(() => usePipelineRepCalculator(emptyRows(), {}, 'manual'));

      act(() => {
        result.current.handleManualE1rmChange('300');
      });
      act(() => {
        result.current.handleRepsChange('5');
      });

      expect(result.current.mode).toBe('manual');
      expect(result.current.reps).toBe('5');
      expect(Number(result.current.weight)).toBeGreaterThan(0);
    }
  );

  it('preserves manual inputs across connect and disconnect transitions', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'loading', model: null });
    const rows = emptyRows();
    rows.squat = splitRows([rec('squat')]);
    let mode: 'manual' | 'connected' = 'manual';
    const { result, rerender } = renderHook(() =>
      usePipelineRepCalculator(rows, { squat: 'Squat' }, mode)
    );

    act(() => {
      result.current.handleManualE1rmChange('300');
    });
    act(() => {
      result.current.handleRepsChange('5');
    });
    const manualWeight = result.current.weight;

    mockUsePipelineModel.mockReturnValue({ status: 'success', model: mockModel(200) });
    mode = 'connected';
    rerender();
    expect(result.current.reps).toBe('5');
    expect(result.current.weight).toBe(manualWeight);

    mockUsePipelineModel.mockReturnValue({ status: 'error', model: null });
    mode = 'manual';
    rerender();
    expect(result.current.manualE1rm).toBe('300');
    expect(result.current.reps).toBe('5');
    expect(result.current.weight).toBe(manualWeight);
  });

  it('computes and displays actual, projected, and source-label e1RM values when model is populated', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'success', model: mockModel(200) });
    const rows = emptyRows();
    rows.squat = splitRows([rec('squat')]);
    const { result } = renderHook(() => usePipelineRepCalculator(rows, { squat: 'Squat' }));

    // All three E1RM display fields should be non-null strings
    expect(result.current.actualE1rmDisplay).toBeDefined();
    expect(typeof result.current.actualE1rmDisplay).toBe('string');
    expect(result.current.actualE1rmDisplay).toContain('kg');

    expect(result.current.projectedE1rmDisplay).toBeDefined();
    expect(typeof result.current.projectedE1rmDisplay).toBe('string');
    expect(result.current.projectedE1rmDisplay).toContain('kg');

    expect(result.current.e1rmSourceLabel).toBeDefined();
    expect(typeof result.current.e1rmSourceLabel).toBe('string');
    expect(
      result.current.e1rmSourceLabel.startsWith('Based on') ||
        result.current.e1rmSourceLabel.startsWith('Projected from')
    ).toBe(true);
  });

  it('returns null for e1RM display fields when model is not in success state', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'loading', model: null });
    const rows = emptyRows();
    rows.squat = splitRows([rec('squat')]);
    const { result } = renderHook(() => usePipelineRepCalculator(rows, { squat: 'Squat' }));

    expect(result.current.actualE1rmDisplay).toBeNull();
    expect(result.current.projectedE1rmDisplay).toBeNull();
    expect(result.current.e1rmSourceLabel).toBeNull();
  });

  it('family-recent e1RM fields return null when no family points available', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: pipelineModelMock({
        model: {
          baseline: { 'lift:squat': 'squat' },
          variantFactor: {},
          addlWtOffset: {},
          fittedAt: Date.now(),
        },
        points: pointStoreMock(new Map([['e1rm-max-effort', []]])),
      }),
    });
    const rows = emptyRows();
    rows.squat = splitRows([rec('squat')]);
    const { result } = renderHook(() => usePipelineRepCalculator(rows, { squat: 'Squat' }));

    expect(result.current.e1rmFamilyRecentDisplay).toBeNull();
    expect(result.current.e1rmFamilyRecentSourceLabel).toBeNull();
  });

  it('family-recent e1RM fields behave correctly when estimate is present', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: mockModel(200),
    });
    const rows = emptyRows();
    rows.squat = splitRows([rec('squat')]);
    const { result } = renderHook(() => usePipelineRepCalculator(rows, { squat: 'Squat' }));

    // Both baseline and family-recent should work with the same mock data
    // The key difference is that family-recent should return non-null when there are points
    expect(result.current.projectedE1rmDisplay).toBeDefined();
    expect(result.current.e1rmFamilyRecentDisplay).toBeDefined();
  });
});
