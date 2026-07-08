import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '@dyel/core';
import { computeStrengthScores } from '@dyel/pipeline';
import type { LiftUnits } from '@dyel/core';

describe('StrengthScoreCalculator core-vs-pipeline parity', () => {
  it.each([
    ['male 82kg 500kg', false, 82, 500, 'kg'],
    ['male 180lbs 1100lbs', false, 180, 1100, 'lbs'],
    ['female 59kg 318kg', true, 59, 318, 'kg'],
    ['female 130lbs 700lbs', true, 130, 700, 'lbs'],
    ['male 75kg 400kg', false, 75, 400, 'kg'],
    ['female 60kg 250kg', true, 60, 250, 'kg'],
  ])(
    'computes matching scores for %s',
    (label: string, isFemale: boolean, bw: number, total: number, unit: string) => {
      const legacy = calculateMetrics(bw, total, isFemale, unit as LiftUnits);
      const pipeline = computeStrengthScores(bw, total, isFemale, unit as 'lbs' | 'kg');

      console.log(
        `${label}: L_W=${legacy.wilks} P_W=${pipeline.wilks} | L_D=${legacy.dots} P_D=${pipeline.dots} | L_SM=${legacy.schwartzmalone} P_SM=${pipeline.schwartzmalone}`
      );
      if (
        legacy.wilksPercentile !== pipeline.wilksPercentile ||
        legacy.dotsPercentile !== pipeline.dotsPercentile ||
        legacy.schwartzmalonePercentile !== pipeline.schwartzmalonePercentile
      ) {
        console.log(
          `Mismatch: W ${pipeline.wilksPercentile} vs ${legacy.wilksPercentile}, D ${pipeline.dotsPercentile} vs ${legacy.dotsPercentile}, SM ${pipeline.schwartzmalonePercentile} vs ${legacy.schwartzmalonePercentile}`
        );
      }

      expect(pipeline.wilks).toBeCloseTo(legacy.wilks, 2);
      expect(pipeline.dots).toBeCloseTo(legacy.dots, 2);
      expect(pipeline.schwartzmalone).toBeCloseTo(legacy.schwartzmalone, 0);
      expect(pipeline.wilksPercentile).toBe(legacy.wilksPercentile);
      expect(pipeline.dotsPercentile).toBe(legacy.dotsPercentile);
      expect(
        Math.abs(pipeline.schwartzmalonePercentile - legacy.schwartzmalonePercentile)
      ).toBeLessThanOrEqual(1);
    }
  );
});
