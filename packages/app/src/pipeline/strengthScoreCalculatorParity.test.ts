import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '@dyel/core';
import { computeStrengthScores } from '@dyel/pipeline';

describe('StrengthScoreCalculator core-vs-pipeline parity', () => {
  it.each([
    ['male 82kg 500kg', false, 82, 500, 'kg'],
    ['male 180lbs 1100lbs', false, 180, 1100, 'lbs'],
    ['female 59kg 318kg', true, 59, 318, 'kg'],
    ['female 130lbs 700lbs', true, 130, 700, 'lbs'],
    ['male 75kg 400kg', false, 75, 400, 'kg'],
    ['female 60kg 250kg', true, 60, 250, 'kg'],
  ])('computes matching scores for %s', (label, isFemale, bodyweight, total, unit) => {
    const legacy = calculateMetrics(bodyweight, total, isFemale, unit);
    const pipeline = computeStrengthScores(bodyweight, total, isFemale, unit as 'lbs' | 'kg');

    console.log(`${label}:`);
    console.log(`  Legacy wilks=${legacy.wilks}, pipeline wilks=${pipeline.wilks}`);
    console.log(`  Legacy dots=${legacy.dots}, pipeline dots=${pipeline.dots}`);
    console.log(`  Legacy SM=${legacy.schwartzmalone}, pipeline SM=${pipeline.schwartzmalone}`);
    if (
      legacy.wilksPercentile !== pipeline.wilksPercentile ||
      legacy.dotsPercentile !== pipeline.dotsPercentile ||
      legacy.schwartzmalonePercentile !== pipeline.schwartzmalonePercentile
    ) {
      console.log(
        `  Percentile mismatch: wilks ${pipeline.wilksPercentile}(p) vs ${legacy.wilksPercentile}(l), dots ${pipeline.dotsPercentile}(p) vs ${legacy.dotsPercentile}(l), SM ${pipeline.schwartzmalonePercentile}(p) vs ${legacy.schwartzmalonePercentile}(l)`
      );
    }

    expect(pipeline.wilks).toBeCloseTo(legacy.wilks, 2);
    expect(pipeline.dots).toBeCloseTo(legacy.dots, 2);
    expect(pipeline.schwartzmalone).toBeCloseTo(legacy.schwartzmalone, 0);
    expect(pipeline.wilksPercentile).toBe(legacy.wilksPercentile);
    expect(pipeline.dotsPercentile).toBe(legacy.dotsPercentile);
    // Allow ±1 for Schwartz-Malone percentile due to rounding in the z-score calculation
    expect(
      Math.abs(pipeline.schwartzmalonePercentile - legacy.schwartzmalonePercentile)
    ).toBeLessThanOrEqual(1);
  });
});
