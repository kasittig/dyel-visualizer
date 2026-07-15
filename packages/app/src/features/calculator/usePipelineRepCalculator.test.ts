import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { TaggedSetRecord, SplitRows, LiftType } from '@dyel/api';
import { usePipelineRepCalculator } from './usePipelineRepCalculator';
import { pipelineModelMock } from '../../test/helpers/pipelineModelFactory';

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
    model: { baseline: { 'lift:squat': 'squat' }, variantFactor: {}, addlWtOffset: {} },
    pointsByDeriver: new Map([
      ['e1rm-max-effort', [{ t: 1, v, series: 'squat', tags: new Set(['lift:squat']) }]],
    ]),
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

  it('re-syncs weight from the existing reps when estimate changes without touching reps directly', () => {
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
    expect(result.current.weight).not.toBe(originalWeight);
    expect(Number(result.current.weight)).toBeGreaterThan(0);
  });
});
