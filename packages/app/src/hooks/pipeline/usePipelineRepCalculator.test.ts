import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { PipelineModel, TaggedSetRecord, SplitRows, LiftType } from '@dyel/api';
import { usePipelineRepCalculator } from './usePipelineRepCalculator';

vi.mock('../../context/PipelineContext');

const mockUsePipelineModel = vi.mocked(
  (await import('../../context/PipelineContext')).usePipelineModel
);

const record = (overrides?: Partial<TaggedSetRecord>): TaggedSetRecord => ({
  date: Date.now(),
  exercise: 'Squat',
  weight: 100,
  reps: 1,
  meta: { rawUnit: 'kg' },
  canonical: 'squat',
  tags: new Set(['lift:squat', 'comp-lift']),
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

const buildFixtureModel = (overrides?: Partial<PipelineModel>): PipelineModel => ({
  model: {
    baseline: { 'lift:squat': 'squat' },
    variantFactor: {},
    addlWtOffset: {},
  },
  diagnostics: { variants: [], weaknesses: [], unassessed: [] },
  unknownExercises: [],
  unnormalized: [],
  parseErrors: [],
  pointsByDeriver: new Map([
    ['e1rm-max-effort', [{ t: 1, v: 200, series: 'squat', tags: new Set(['lift:squat']) }]],
  ]),
  pointsByLabelByDeriver: new Map(),
  pointsByDeriverAdjusted: new Map(),
  athlete: { sex: 'M', bodyweight: 90, deadliftStance: 'sumo' },
  ...overrides,
});

describe('usePipelineRepCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial state shape with empty records', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'loading', model: null });

    const { result } = renderHook(() => usePipelineRepCalculator(emptyRows(), {}));

    expect(result.current.liftType).toBe('squat');
    expect(result.current.exercisesForType).toEqual([]);
    expect(result.current.activeCanonical).toBe('');
    expect(result.current.selectedRecord).toBeUndefined();
    expect(result.current.selectedBar).toBeNull();
    expect(result.current.selectedStance).toBeNull();
    expect(result.current.selectedEquipment).toBeNull();
    expect(result.current.selectedAddlWt).toBeNull();
    expect(result.current.selectedEquipmentMagnitude).toBeNull();
    expect(result.current.availableMagnitudes).toEqual([]);
    expect(result.current.reps).toBe('');
    expect(result.current.weight).toBe('');
    expect(result.current.unit).toBe('kg');
    expect(result.current.estimate).toBeNull();
  });

  it('handleSelectedCanonicalChange updates facets/inputs from the selected record', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'loading', model: null });

    const squatBoard = record({
      canonical: 'squat-board',
      exercise: 'Squat (2 board)',
      tags: new Set(['lift:squat', 'equip:board-2']),
    });
    const rows = emptyRows();
    rows.squat = splitRows([record(), squatBoard]);

    const { result } = renderHook(() => usePipelineRepCalculator(rows, {}));

    act(() => {
      result.current.handleSelectedCanonicalChange('squat-board');
    });

    expect(result.current.activeCanonical).toBe('squat-board');
    expect(result.current.selectedEquipment).toBe('board');
    expect(result.current.selectedEquipmentMagnitude).toBe('2');
    expect(result.current.reps).toBe('');
    expect(result.current.weight).toBe('');
  });

  it('handleRepsChange predicts weight from a mock model', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'success', model: buildFixtureModel() });

    const rows = emptyRows();
    rows.squat = splitRows([record()]);

    const { result } = renderHook(() => usePipelineRepCalculator(rows, { squat: 'Squat' }));

    act(() => {
      result.current.handleRepsChange('5');
    });

    expect(result.current.reps).toBe('5');
    expect(Number(result.current.weight)).toBeGreaterThan(0);
  });

  it('handleWeightChange predicts reps from a mock model', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'success', model: buildFixtureModel() });

    const rows = emptyRows();
    rows.squat = splitRows([record()]);

    const { result } = renderHook(() => usePipelineRepCalculator(rows, { squat: 'Squat' }));

    act(() => {
      result.current.handleWeightChange('150');
    });

    expect(result.current.weight).toBe('150');
    expect(Number(result.current.reps)).toBeGreaterThan(0);
  });

  it('re-syncs weight from the existing reps when estimate/unit change, without changing reps', () => {
    let model = buildFixtureModel();
    mockUsePipelineModel.mockReturnValue({ status: 'success', model });

    const rows = emptyRows();
    rows.squat = splitRows([record()]);

    const { result, rerender } = renderHook(() =>
      usePipelineRepCalculator(rows, { squat: 'Squat' })
    );

    act(() => {
      result.current.handleRepsChange('5');
    });

    const repsAfterInput = result.current.reps;
    const weightAfterInput = result.current.weight;
    expect(repsAfterInput).toBe('5');
    expect(Number(weightAfterInput)).toBeGreaterThan(0);

    // Change the underlying model (changes the estimate) without touching reps directly.
    model = buildFixtureModel({
      pointsByDeriver: new Map([
        ['e1rm-max-effort', [{ t: 2, v: 300, series: 'squat', tags: new Set(['lift:squat']) }]],
      ]),
    });
    mockUsePipelineModel.mockReturnValue({ status: 'success', model });

    act(() => {
      rerender();
    });

    expect(result.current.reps).toBe(repsAfterInput);
    expect(result.current.weight).not.toBe(weightAfterInput);
    expect(Number(result.current.weight)).toBeGreaterThan(0);
  });
});
