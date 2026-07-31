import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { buildChartDatasets } from '@dyel/api';
import type { DatasetSpec, RenderParams, Point } from '@dyel/api';
import { pipelineModelMock, pointStoreMock } from '../../test/helpers/pipelineModelFactory';
import { usePipelineDatasets } from './usePipelineDatasets';

vi.mock('../../app/PipelineContext');
const mockUsePipelineModel = vi.mocked(
  (await import('../../app/PipelineContext')).usePipelineModel
);

const p = (t: number, v: number): Point => ({
  t,
  v,
  series: 'squat',
  tags: new Set(['lift:squat']),
});

const seriesSpec: DatasetSpec = {
  id: 'squat_e1rm',
  kind: 'series',
  include: { all: ['lift:squat'] },
  derive: 'e1rm',
};
const compositeSpec: DatasetSpec = {
  id: 'total',
  kind: 'composite',
  derive: 'e1rm',
  normalize: true,
  combine: 'sum',
  components: [
    { label: 'squat', include: { all: ['lift:squat'] } },
    { label: 'bench', include: { all: ['lift:bench'] } },
    { label: 'deadlift', include: { all: ['lift:deadlift'] } },
  ],
};

describe('usePipelineDatasets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies initialization boundaries, core mappings, and matrix handlers', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'loading', model: null });
    expect(renderHook(() => usePipelineDatasets([seriesSpec], {})).result.current).toEqual({});

    const model = pipelineModelMock({
      points: pointStoreMock(new Map([['e1rm', [p(1609459200000, 100), p(1612137600000, 110)]]])),
    });
    mockUsePipelineModel.mockReturnValue({ status: 'success', model });
    const { result } = renderHook(() => usePipelineDatasets([seriesSpec], {}));
    expect(result.current).toEqual(buildChartDatasets(model, [seriesSpec], {}));

    expect(buildChartDatasets(model, [seriesSpec], {})).toBeDefined();
    expect(buildChartDatasets(model, [compositeSpec], {})).toBeDefined();
  });

  it('tracks memoization dependencies and reference updates across lifecycles', () => {
    const model1 = pipelineModelMock({
      points: pointStoreMock(new Map([['e1rm', [p(1609459200000, 100), p(1612137600000, 110)]]])),
    });
    mockUsePipelineModel.mockReturnValue({ status: 'success', model: model1 });
    const ui1: RenderParams = {};
    const specs = [seriesSpec];

    const { result, rerender } = renderHook(({ s, u }) => usePipelineDatasets(s, u), {
      initialProps: { s: specs, u: ui1 },
    });
    const initialResult = result.current;

    rerender({ s: specs, u: ui1 });
    expect(result.current).toBe(initialResult);

    rerender({ s: [seriesSpec, compositeSpec], u: ui1 });
    expect(result.current).not.toBe(initialResult);

    rerender({ s: specs, u: { dateRange: [1, 2] } });
    expect(result.current).not.toBe(initialResult);

    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: pipelineModelMock({
        athlete: { sex: 'F', bodyweight: 65 },
        points: pointStoreMock(new Map([['e1rm', [p(1609459200000, 100), p(1612137600000, 110)]]])),
      }),
    });
    rerender({ s: specs, u: ui1 });
    expect(result.current).not.toBe(initialResult);
  });
});
