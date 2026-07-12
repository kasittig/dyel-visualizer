import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { renderHook } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PipelineModel } from '@dyel/pipeline';
import { runPipelineModel } from '@dyel/pipeline';
import type { PipelineStatus } from '../../app/PipelineContext';
import { usePipelineVariationRadarData } from './usePipelineVariationRadarData';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../../features/data-source/rawInput';

vi.mock('recharts', () => ({}));
vi.mock('../../app/PipelineContext');
const mockUsePipelineModel = vi.mocked(
  (await import('../../app/PipelineContext')).usePipelineModel
);

describe('usePipelineVariationRadarData', () => {
  let fixtureModel: PipelineModel;

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  beforeAll(() => {
    const txt = readFileSync(
      join(__dirname, '../../../test/fixtures/total-chart-sheet.csv'),
      'utf-8'
    );
    fixtureModel = runPipelineModel([buildRawInput('url', txt)], PLACEHOLDER_ATHLETE);
  });

  it.each<[string, PipelineStatus]>([
    ['loading', 'loading'],
    ['error', 'error'],
    ['empty model', 'success'],
  ])('returns empty state configuration: %s', (_, status) => {
    mockUsePipelineModel.mockReturnValue({ status, model: null });
    const { result } = renderHook(() => usePipelineVariationRadarData('squat', 'lbs'));
    expect(result.current.snapshot).toEqual({});
    expect(result.current.normalizedSnapshot).toEqual({});
    expect(result.current.lastSessionByLabel.size).toBe(0);
  });

  it('evaluates calculations, scaling factors, metrics, and radar row structures natively', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'success', model: fixtureModel });
    const squat = renderHook(() => usePipelineVariationRadarData('squat', 'lbs')).result.current;
    const squatKg = renderHook(() => usePipelineVariationRadarData('squat', 'kg')).result.current;
    const bench = renderHook(() => usePipelineVariationRadarData('bench', 'lbs')).result.current;

    const values = Object.values(squat.snapshot).filter((v): v is number => typeof v === 'number');
    const valuesKg = Object.values(squatKg.snapshot).filter(
      (v): v is number => typeof v === 'number'
    );

    if (values.length > 0) {
      values.forEach((v) => expect(v).toBeGreaterThan(0));
    }
    if (values.length > 0 && valuesKg.length > 0) {
      values.forEach((lbs, i) => {
        expect(lbs / valuesKg[i]).toBeGreaterThan(2);
        expect(lbs / valuesKg[i]).toBeLessThan(2.5);
      });
    }
    if (Object.keys(squat.snapshot).length > 0 && Object.keys(bench.snapshot).length > 0) {
      expect(JSON.stringify(squat.snapshot)).not.toBe(JSON.stringify(bench.snapshot));
    }

    if (squat.lastSessionByLabel.size > 0) {
      for (const [label, detail] of squat.lastSessionByLabel) {
        expect(typeof label).toBe('string');
        expect(detail.sets).toBeGreaterThan(0);
      }
    }
    if (squat.canonicalByLabel.size > 0) {
      for (const [label, canonical] of squat.canonicalByLabel) {
        expect(typeof label).toBe('string');
        expect(typeof canonical).toBe('string');
      }
    }

    expect(Array.isArray(squat.data)).toBe(true);
    if (squat.data.length > 0) {
      squat.data.forEach((row) => {
        expect(typeof row.variation).toBe('string');
        expect(row.e1rm).toBeGreaterThan(0);
      });
    }
  });
});
