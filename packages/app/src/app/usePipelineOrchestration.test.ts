import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { RawInput, AthleteContext } from '@dyel/api';
import { usePipelineOrchestration } from './usePipelineOrchestration';
import * as useResolvedRawInput from '../features/data-source/useResolvedRawInput';

vi.mock('../features/data-source/useResolvedRawInput');
const mockRes = vi.mocked(useResolvedRawInput.useResolvedRawInput);
const athleteBase: Pick<AthleteContext, 'sex' | 'bodyweight'> = { sex: 'M', bodyweight: 80 };

const dlFix: RawInput[] = [
  {
    name: 't.csv',
    content:
      'date,exercise,weight,reps\n2024-01-01,deadlift,300,1\n2024-01-02,sumo deadlift,280,1\n2024-01-03,conventional deadlift,320,1',
  },
];
const sumoFix: RawInput[] = [
  {
    name: 't.csv',
    content:
      'date,exercise,weight,reps\n2024-01-01,sumo deadlift,280,1\n2024-01-02,sumo deadlift,285,1',
  },
];
const convFix: RawInput[] = [
  {
    name: 't.csv',
    content:
      'date,exercise,weight,reps\n2024-01-01,conventional deadlift,300,1\n2024-01-02,conventional deadlift,310,1',
  },
];
const noDlFix: RawInput[] = [
  {
    name: 't.csv',
    content: 'date,exercise,weight,reps\n2024-01-01,squat,400,1\n2024-01-02,bench press,300,1',
  },
];

const run = (stance: 'sumo' | 'conventional' | null) =>
  renderHook(() =>
    usePipelineOrchestration('url', 'https://example.com', '', 0, athleteBase, stance)
  );

describe('usePipelineOrchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['explicit sumo', 'sumo' as const, dlFix, 'sumo'],
    ['explicit conventional', 'conventional' as const, dlFix, 'conventional'],
  ])('%s', (_, stance, raw, expected) => {
    mockRes.mockReturnValue({ status: 'success', raw });
    const { result } = run(stance);
    expect(result.current.status).toBe('success');
    expect(result.current.model!.athlete.deadliftStance).toBe(expected);
  });

  it('resolves null (auto) to conventional when conventional is stronger', () => {
    mockRes.mockReturnValue({ status: 'success', raw: dlFix });
    expect(run(null).result.current.model!.athlete.deadliftStance).toBe('conventional');
  });

  it('resolves null (auto) with only sumo entries to sumo', () => {
    mockRes.mockReturnValue({ status: 'success', raw: sumoFix });
    expect(run(null).result.current.model!.athlete.deadliftStance).toBe('sumo');
  });

  it('resolves null (auto) with only conventional entries to conventional', () => {
    mockRes.mockReturnValue({ status: 'success', raw: convFix });
    expect(run(null).result.current.model!.athlete.deadliftStance).toBe('conventional');
  });

  it('resolves null (auto) with no deadlift data to sumo (default)', () => {
    mockRes.mockReturnValue({ status: 'success', raw: noDlFix });
    expect(run(null).result.current.model!.athlete.deadliftStance).toBe('sumo');
  });

  it('passes through loading and error states', () => {
    mockRes.mockReturnValue({ status: 'loading', raw: [] });
    expect(run('sumo').result.current.status).toBe('loading');
    mockRes.mockReturnValue({ status: 'error', raw: [] });
    expect(run('sumo').result.current.status).toBe('error');
  });

  it('recomputes model when deadliftStance changes', () => {
    mockRes.mockReturnValue({ status: 'success', raw: dlFix });
    const { result, rerender } = renderHook(
      (p) => usePipelineOrchestration('url', 'https://example.com', '', 0, athleteBase, p.s),
      { initialProps: { s: 'sumo' as const } }
    );
    expect(result.current.model!.athlete.deadliftStance).toBe('sumo');
    rerender({ s: 'conventional' as const });
    expect(result.current.model!.athlete.deadliftStance).toBe('conventional');
  });
});
