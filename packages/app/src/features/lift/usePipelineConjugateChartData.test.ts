import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { renderHook } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PipelineModel } from '@dyel/pipeline';
import { runPipelineModel } from '@dyel/pipeline';
import { usePipelineConjugateChartData } from './usePipelineConjugateChartData';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../data-source';

vi.mock('recharts', () => ({}));
vi.mock('../../app/PipelineContext');
const mockUsePipelineModel = vi.mocked(
  (await import('../../app/PipelineContext')).usePipelineModel
);

const FULL_RANGE = { from: new Date('2000-01-01'), to: new Date('2100-01-01') };

describe('usePipelineConjugateChartData', () => {
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

  // Regression test for the "most accessories don't load" bug: total-chart-sheet.csv logs
  // accessory work almost exclusively as multi-set (Sets >= 2) with no RPE, which
  // conjugateChartSpecs previously misclassified as speed-work-only via the
  // 'e1rm-max-effort' deriver and dropped entirely. conjugateChartSpecs now uses the
  // never-drop 'e1rm' deriver for liftType 'accessory', so these variations should surface.
  it.each(['H-Roll', 'French Press', 'DB Curl', 'Facepull'])(
    'surfaces multi-set/no-RPE accessory variation: %s',
    (variation) => {
      mockUsePipelineModel.mockReturnValue({ status: 'success', model: fixtureModel });
      const { result } = renderHook(() =>
        usePipelineConjugateChartData('accessory', FULL_RANGE, 'lbs')
      );
      expect(result.current.variations).toContain(variation);
      expect(result.current.data.some((row) => typeof row[variation] === 'number')).toBe(true);
    }
  );
});
