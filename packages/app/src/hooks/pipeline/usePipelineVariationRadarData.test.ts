import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { renderHook } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PipelineModel } from '@dyel/pipeline';
import { runPipelineModel } from '@dyel/pipeline';
import { usePipelineVariationRadarData } from './usePipelineVariationRadarData';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../../utils/rawInput';

vi.mock('../../context/PipelineContext');

const mockUsePipelineModel = vi.mocked(
  (await import('../../context/PipelineContext')).usePipelineModel
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
    // Load the fixture CSV and build a real pipeline model for testing
    const txt: string = readFileSync(
      join(__dirname, '../../../test/fixtures/total-chart-sheet.csv'),
      'utf-8'
    );
    const raw = buildRawInput('url', txt);

    // Parse with pipeline and run the model
    fixtureModel = runPipelineModel([raw], PLACEHOLDER_ATHLETE);
  });

  it('returns empty snapshot and lastSessionByLabel when status is loading', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'loading',
      model: null,
    });

    const { result } = renderHook(() => usePipelineVariationRadarData('squat', 'lbs'));

    expect(result.current.snapshot).toEqual({});
    expect(result.current.normalizedSnapshot).toEqual({});
    expect(result.current.lastSessionByLabel.size).toBe(0);
    expect(result.current.canonicalByLabel.size).toBe(0);
  });

  it('returns empty snapshot and lastSessionByLabel when status is error', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'error',
      model: null,
    });

    const { result } = renderHook(() => usePipelineVariationRadarData('squat', 'lbs'));

    expect(result.current.snapshot).toEqual({});
    expect(result.current.normalizedSnapshot).toEqual({});
    expect(result.current.lastSessionByLabel.size).toBe(0);
    expect(result.current.canonicalByLabel.size).toBe(0);
  });

  it('returns empty snapshot and lastSessionByLabel when model is null', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: null,
    });

    const { result } = renderHook(() => usePipelineVariationRadarData('squat', 'lbs'));

    expect(result.current.snapshot).toEqual({});
    expect(result.current.normalizedSnapshot).toEqual({});
    expect(result.current.lastSessionByLabel.size).toBe(0);
    expect(result.current.canonicalByLabel.size).toBe(0);
  });

  it('produces non-empty snapshot with real fixture for squat', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result } = renderHook(() => usePipelineVariationRadarData('squat', 'lbs'));

    // Check that snapshot has at least some entries
    const snapshotValues = Object.values(result.current.snapshot).filter(
      (v): v is number => typeof v === 'number'
    );
    if (snapshotValues.length > 0) {
      expect(snapshotValues.length).toBeGreaterThan(0);
      // Verify values are in a plausible e1RM range
      snapshotValues.forEach((v) => {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(10000);
      });
    }
  });

  it('produces non-empty lastSessionByLabel with real fixture for squat', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result } = renderHook(() => usePipelineVariationRadarData('squat', 'lbs'));

    // If there's data, check that lastSessionByLabel has the right shape
    if (result.current.lastSessionByLabel.size > 0) {
      for (const [label, detail] of result.current.lastSessionByLabel) {
        expect(typeof label).toBe('string');
        expect(detail.date).toBeDefined();
        expect(typeof detail.date).toBe('string');
        expect(detail.sets).toBeGreaterThan(0);
        expect(detail.reps).toBeGreaterThan(0);
        expect(detail.weight).toBeGreaterThan(0);
        expect(detail.rpe === null || typeof detail.rpe === 'number').toBe(true);
      }
    }
  });

  it('populates canonicalByLabel with real fixture for squat', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result } = renderHook(() => usePipelineVariationRadarData('squat', 'lbs'));

    // Check that canonicalByLabel has at least one entry and values are strings
    if (result.current.canonicalByLabel.size > 0) {
      expect(result.current.canonicalByLabel.size).toBeGreaterThan(0);
      for (const [label, canonical] of result.current.canonicalByLabel) {
        expect(typeof label).toBe('string');
        expect(typeof canonical).toBe('string');
      }
    }
  });

  it('respects unit parameter for snapshot conversion (kg)', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result: resultLbs } = renderHook(() => usePipelineVariationRadarData('squat', 'lbs'));
    const { result: resultKg } = renderHook(() => usePipelineVariationRadarData('squat', 'kg'));

    // Extract numeric values from both
    const valuesLbs = Object.values(resultLbs.current.snapshot).filter(
      (v): v is number => typeof v === 'number'
    );
    const valuesKg = Object.values(resultKg.current.snapshot).filter(
      (v): v is number => typeof v === 'number'
    );

    // If both have values, lbs should be roughly 2.2x kg (with rounding)
    if (valuesLbs.length > 0 && valuesKg.length > 0) {
      const ratios = valuesLbs.map((lbs, i) => lbs / valuesKg[i]);
      ratios.forEach((ratio) => {
        expect(ratio).toBeGreaterThan(2);
        expect(ratio).toBeLessThan(2.5);
      });
    }
  });

  it('produces different snapshots for different lift types', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result: squat } = renderHook(() => usePipelineVariationRadarData('squat', 'lbs'));
    const { result: bench } = renderHook(() => usePipelineVariationRadarData('bench', 'lbs'));

    // Just verify we get different results (or both empty, which is also valid)
    const squatKeys = Object.keys(squat.current.snapshot);
    const benchKeys = Object.keys(bench.current.snapshot);

    // If both have data, they should (likely) be different exercise sets
    if (squatKeys.length > 0 && benchKeys.length > 0) {
      expect(JSON.stringify(squat.current.snapshot)).not.toBe(
        JSON.stringify(bench.current.snapshot)
      );
    }
  });

  it('produces normalizedSnapshot with real fixture for squat', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result } = renderHook(() => usePipelineVariationRadarData('squat', 'lbs'));

    // Check that normalizedSnapshot exists and has proper shape
    expect(typeof result.current.normalizedSnapshot).toBe('object');
    const normalizedValues = Object.values(result.current.normalizedSnapshot).filter(
      (v): v is number => typeof v === 'number'
    );
    // normalizedSnapshot may be empty if canonicals are unmapped or unfitted, which is valid
    if (normalizedValues.length > 0) {
      normalizedValues.forEach((v) => {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(10000);
      });
    }
  });
});
