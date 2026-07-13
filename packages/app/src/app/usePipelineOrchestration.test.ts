import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { RawInput, AthleteContext } from '@dyel/api';
import { usePipelineOrchestration } from './usePipelineOrchestration';
import * as useResolvedRawInput from '../features/data-source/useResolvedRawInput';

vi.mock('../features/data-source/useResolvedRawInput');
const mockUseResolvedRawInput = vi.mocked(useResolvedRawInput.useResolvedRawInput);

const athleteBase: Pick<AthleteContext, 'sex' | 'bodyweight'> = { sex: 'M', bodyweight: 80 };

// Raw fixture: simple deadlifts with conventional and sumo variants at different weights
const deadliftFixture: RawInput[] = [
  {
    name: 'test.csv',
    content: `date,exercise,weight,reps
2024-01-01,deadlift,300,1
2024-01-02,sumo deadlift,280,1
2024-01-03,conventional deadlift,320,1`,
  },
];

// Raw fixture: only sumo deadlift entries
const sumoOnlyFixture: RawInput[] = [
  {
    name: 'test.csv',
    content: `date,exercise,weight,reps
2024-01-01,sumo deadlift,280,1
2024-01-02,sumo deadlift,285,1`,
  },
];

// Raw fixture: only conventional deadlift entries
const conventionalOnlyFixture: RawInput[] = [
  {
    name: 'test.csv',
    content: `date,exercise,weight,reps
2024-01-01,conventional deadlift,300,1
2024-01-02,conventional deadlift,310,1`,
  },
];

// Raw fixture: no deadlift at all
const noDeadliftFixture: RawInput[] = [
  {
    name: 'test.csv',
    content: `date,exercise,weight,reps
2024-01-01,squat,400,1
2024-01-02,bench press,300,1`,
  },
];

describe('usePipelineOrchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['explicit sumo', 'sumo' as const, deadliftFixture, 'sumo'],
    ['explicit conventional', 'conventional' as const, deadliftFixture, 'conventional'],
  ])('builds model once with %s stance', (_, deadliftStance, raw, expectedStance) => {
    mockUseResolvedRawInput.mockReturnValue({ status: 'success', raw });

    const { result } = renderHook(() =>
      usePipelineOrchestration('url', 'https://example.com', '', 0, athleteBase, deadliftStance)
    );

    expect(result.current.status).toBe('success');
    expect(result.current.model).not.toBeNull();
    expect(result.current.model!.athlete.deadliftStance).toBe(expectedStance);
  });

  it('resolves auto to conventional when conventional is stronger', () => {
    mockUseResolvedRawInput.mockReturnValue({ status: 'success', raw: deadliftFixture });

    const { result } = renderHook(() =>
      usePipelineOrchestration('url', 'https://example.com', '', 0, athleteBase, 'auto')
    );

    expect(result.current.status).toBe('success');
    expect(result.current.model).not.toBeNull();
    // The fixture has conventional deadlift at 320kg vs sumo/generic deadlifts at 280-300kg
    expect(result.current.model!.athlete.deadliftStance).toBe('conventional');
  });

  it('resolves auto with only sumo entries to sumo', () => {
    mockUseResolvedRawInput.mockReturnValue({ status: 'success', raw: sumoOnlyFixture });

    const { result } = renderHook(() =>
      usePipelineOrchestration('url', 'https://example.com', '', 0, athleteBase, 'auto')
    );

    expect(result.current.status).toBe('success');
    expect(result.current.model).not.toBeNull();
    expect(result.current.model!.athlete.deadliftStance).toBe('sumo');
  });

  it('resolves auto with only conventional entries to conventional', () => {
    mockUseResolvedRawInput.mockReturnValue({
      status: 'success',
      raw: conventionalOnlyFixture,
    });

    const { result } = renderHook(() =>
      usePipelineOrchestration('url', 'https://example.com', '', 0, athleteBase, 'auto')
    );

    expect(result.current.status).toBe('success');
    expect(result.current.model).not.toBeNull();
    expect(result.current.model!.athlete.deadliftStance).toBe('conventional');
  });

  it('resolves auto with no deadlift data to sumo (default)', () => {
    mockUseResolvedRawInput.mockReturnValue({ status: 'success', raw: noDeadliftFixture });

    const { result } = renderHook(() =>
      usePipelineOrchestration('url', 'https://example.com', '', 0, athleteBase, 'auto')
    );

    expect(result.current.status).toBe('success');
    expect(result.current.model).not.toBeNull();
    expect(result.current.model!.athlete.deadliftStance).toBe('sumo');
  });

  it('passes through loading and error states', () => {
    mockUseResolvedRawInput.mockReturnValue({ status: 'loading', raw: [] });

    const { result: loadingResult } = renderHook(() =>
      usePipelineOrchestration('url', 'https://example.com', '', 0, athleteBase, 'sumo')
    );
    expect(loadingResult.current.status).toBe('loading');
    expect(loadingResult.current.model).toBeNull();

    mockUseResolvedRawInput.mockReturnValue({ status: 'error', raw: [] });

    const { result: errorResult } = renderHook(() =>
      usePipelineOrchestration('url', 'https://example.com', '', 0, athleteBase, 'sumo')
    );
    expect(errorResult.current.status).toBe('error');
    expect(errorResult.current.model).toBeNull();
  });

  it('recomputes model when deadliftStance changes', () => {
    mockUseResolvedRawInput.mockReturnValue({ status: 'success', raw: deadliftFixture });

    const { result, rerender } = renderHook(
      (props) =>
        usePipelineOrchestration(
          props.inputMode,
          props.url,
          props.pastedText,
          props.refreshToken,
          props.athleteBase,
          props.deadliftStance
        ),
      {
        initialProps: {
          inputMode: 'url' as const,
          url: 'https://example.com',
          pastedText: '',
          refreshToken: 0,
          athleteBase,
          deadliftStance: 'sumo' as const,
        },
      }
    );

    expect(result.current.model!.athlete.deadliftStance).toBe('sumo');

    rerender({
      inputMode: 'url' as const,
      url: 'https://example.com',
      pastedText: '',
      refreshToken: 0,
      athleteBase,
      deadliftStance: 'conventional' as const,
    });

    expect(result.current.model!.athlete.deadliftStance).toBe('conventional');
  });
});
