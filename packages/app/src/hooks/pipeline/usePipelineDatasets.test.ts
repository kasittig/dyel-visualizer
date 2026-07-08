import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { PipelineModel, DatasetSpec, RenderParams, Point } from '@dyel/pipeline';
import { buildDatasetsFromModel } from '@dyel/pipeline';
import { usePipelineDatasets } from './usePipelineDatasets';

vi.mock('../../context/PipelineContext');

const mockUsePipelineModel = vi.mocked(
  (await import('../../context/PipelineContext')).usePipelineModel
);

const buildFixtureModel = (overrides?: Partial<PipelineModel>): PipelineModel => {
  const baselinePoint: Point = {
    t: 1609459200000, // 2021-01-01
    v: 100,
    series: 'squat',
    tags: new Set(['lift:squat']),
  };
  const variantPoint: Point = {
    t: 1612137600000, // 2021-02-01
    v: 110,
    series: 'squat',
    tags: new Set(['lift:squat']),
  };

  return {
    model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
    diagnostics: { byCanonical: new Map(), allFindings: [] },
    unknownExercises: [],
    unnormalized: [],
    parseErrors: [],
    pointsByDeriver: new Map([['e1rm', [baselinePoint, variantPoint]]]),
    pointsByLabelByDeriver: new Map([['e1rm', [baselinePoint, variantPoint]]]),
    pointsByDeriverAdjusted: new Map([['e1rm', [baselinePoint, variantPoint]]]),
    athlete: { sex: 'M', bodyweight: 90, deadliftStance: 'sumo' },
    ...overrides,
  };
};

const seriesSpec: DatasetSpec = {
  id: 'squat_e1rm',
  kind: 'series',
  include: { all: ['lift:squat'] },
  derive: 'e1rm',
};

const compositeSpec: DatasetSpec = {
  id: 'total',
  kind: 'composite',
  components: [
    { label: 'squat', include: { all: ['lift:squat'] } },
    { label: 'bench', include: { all: ['lift:bench'] } },
    { label: 'deadlift', include: { all: ['lift:deadlift'] } },
  ],
  derive: 'e1rm',
  normalize: true,
  combine: 'sum',
};

describe('usePipelineDatasets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty object when model is null', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'loading',
      model: null,
    });

    const { result } = renderHook(() => usePipelineDatasets([seriesSpec], {}));

    expect(result.current).toEqual({});
  });

  it('returns datasets that match buildDatasetsFromModel output', () => {
    const fixtureModel = buildFixtureModel();
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const ui: RenderParams = {};
    const { result } = renderHook(() => usePipelineDatasets([seriesSpec], ui));

    const expected = buildDatasetsFromModel(fixtureModel, [seriesSpec], ui);
    expect(result.current).toEqual(expected);
  });

  it('memoizes and does not recompute with identical model and specs', () => {
    const fixtureModel = buildFixtureModel();
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const ui: RenderParams = {};
    const specs = [seriesSpec];

    const { result, rerender } = renderHook(({ s, u }) => usePipelineDatasets(s, u), {
      initialProps: { s: specs, u: ui },
    });

    const firstResult = result.current;

    // Rerender with same object references — should return same object reference
    rerender({ s: specs, u: ui });

    expect(result.current).toBe(firstResult);
  });

  it('recomputes when specs array changes (new reference)', () => {
    const fixtureModel = buildFixtureModel();
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const ui: RenderParams = {};
    const specs1 = [seriesSpec];
    const specs2 = [seriesSpec, compositeSpec];

    const { result, rerender } = renderHook(({ s, u }) => usePipelineDatasets(s, u), {
      initialProps: { s: specs1, u: ui },
    });

    const firstResult = result.current;

    // Rerender with new specs array
    rerender({ s: specs2, u: ui });

    expect(result.current).not.toBe(firstResult);
    expect(Object.keys(result.current).length).toBeGreaterThan(Object.keys(firstResult).length);
  });

  it('recomputes when ui object changes (new reference)', () => {
    const fixtureModel = buildFixtureModel();
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const specs = [seriesSpec];
    const ui1: RenderParams = {};
    const ui2: RenderParams = { dateRange: [1609459200000, 1612137600000] };

    const { result, rerender } = renderHook(({ s, u }) => usePipelineDatasets(s, u), {
      initialProps: { s: specs, u: ui1 },
    });

    const firstResult = result.current;

    // Rerender with new ui object
    rerender({ s: specs, u: ui2 });

    expect(result.current).not.toBe(firstResult);
  });

  it('recomputes when model changes', () => {
    const fixtureModel1 = buildFixtureModel();
    const fixtureModel2 = buildFixtureModel({
      athlete: { sex: 'F', bodyweight: 65, deadliftStance: 'conventional' },
    });

    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel1,
    });

    const ui: RenderParams = {};
    const specs = [seriesSpec];

    const { result, rerender } = renderHook(
      () => {
        return usePipelineDatasets(specs, ui);
      },
      { wrapper: ({ children }) => children }
    );

    const firstResult = result.current;

    // Change mock to return different model
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel2,
    });

    rerender();

    expect(result.current).not.toBe(firstResult);
  });

  it.each([
    [
      'series spec',
      [seriesSpec],
      {},
      (datasets: Record<string, unknown[]>) => 'squat_e1rm' in datasets,
    ],
    [
      'composite spec',
      [compositeSpec],
      {},
      (datasets: Record<string, unknown[]>) => 'total' in datasets,
    ],
    [
      'with date range',
      [seriesSpec],
      { dateRange: [1609459200000, 1612137600000] },
      (datasets: Record<string, unknown[]>) => 'squat_e1rm' in datasets,
    ],
  ])('handles %s correctly', (label, specs, ui, assertion) => {
    const fixtureModel = buildFixtureModel();
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result } = renderHook(() => usePipelineDatasets(specs, ui));

    expect(assertion(result.current)).toBe(true);
  });
});
