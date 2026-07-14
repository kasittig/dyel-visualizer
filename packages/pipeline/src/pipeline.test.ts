import { describe, it, expect } from 'vitest';
import { runPipelineModel } from './pipeline';
import type { PipelineModel } from './pipeline';

const ath = () => ({ sex: 'M' as const, bodyweight: 90, deadliftStance: 'conventional' as const });

describe('pipeline orchestration', () => {
  it('fits normalization model on full tagged set including speed-work records', () => {
    // Freeform log: regular bench (baseline) + speed-work dumbbell bench variant
    // Speed-work is identified by sets>=2 with no RPE
    // The critical test: if pipeline.ts reverted to old pre-filter (filtering out sets>=2),
    // bench-dumbbell would not be included in fitting and would have no variantFactor.
    // With current pipeline.ts (fitting on full tagged set), it should have a variantFactor.
    const log = `units: kg
2024-01-01 Bench 100 x5 @8
2024-01-02 Bench 105 x5 @8
2024-01-03 Bench 110 x5 @8
2024-01-04 Bench 115 x5 @8
2024-01-02 Dumbbell Bench 3x5 @ 45
2024-01-07 Dumbbell Bench 3x5 @ 50`;

    const model = runPipelineModel([{ name: 'log.txt', content: log }], ath()) as PipelineModel;

    // Verify baseline is regular bench (has more records than dumbbell variant)
    expect(model.model.baseline['lift:bench']).toBe('bench');

    // Critical assertion: bench-dumbbell should have a variantFactor
    // This ONLY happens if speed-work records (sets>=2, no rpe) were included in fitting.
    // If pipeline.ts used the old pre-filter (filtering out sets>=2, no rpe before passing
    // to fitNormalizationModel), then bench-dumbbell would have zero records passed to fit,
    // and would have no variantFactor.
    expect(model.model.variantFactor['bench-dumbbell']).toBeDefined();
    expect(model.model.variantFactor['bench-dumbbell']?.factor).toBeGreaterThan(0);
  });

  it('produces distinct adjusted vs non-adjusted point maps for offset-adjusted records', () => {
    // Freeform log with chains variant
    // Chains have additional weight that should be offset-adjusted
    const log = `2024-01-01 Bench 100kg x5 @8
2024-01-01 Bench (chains) 80kg x5
2024-01-05 Bench 105kg x5 @8
2024-01-05 Bench (chains) 85kg x5`;

    const model = runPipelineModel([{ name: 'log.txt', content: log }], ath()) as PipelineModel;

    // Verify model has offset for bench-chains (or bench-chains variant)
    const chainVariant = Object.keys(model.model.addlWtOffset).find(
      (k) => k.includes('chain') || k.includes('Chain')
    );
    expect(chainVariant).toBeDefined();

    if (!chainVariant) {
      throw new Error('Expected chains variant with offset');
    }

    const offset = model.model.addlWtOffset[chainVariant].offsetKg;
    expect(offset).toBeGreaterThan(0);

    // Get e1rm points before and after adjustment
    const unadjustedPoints = model.pointsByDeriver.get('e1rm') ?? [];
    const adjustedPoints = model.pointsByDeriverAdjusted.get('e1rm') ?? [];

    // Find points for the chain variant in both sets
    const unadjustedChainPoints = unadjustedPoints.filter((p) => p.series === chainVariant);
    const adjustedChainPoints = adjustedPoints.filter((p) => p.series === chainVariant);

    // Both should have records
    expect(unadjustedChainPoints.length).toBeGreaterThan(0);
    expect(adjustedChainPoints.length).toBeGreaterThan(0);

    // The adjusted points should have higher e1rm values (because offset was added to weight).
    // Verify at least one adjusted point differs from its unadjusted counterpart.
    let foundDifference = false;
    for (const adjusted of adjustedChainPoints) {
      const unadjusted = unadjustedChainPoints.find((p) => p.t === adjusted.t);
      if (unadjusted && Math.abs(adjusted.v - unadjusted.v) > 0.01) {
        foundDifference = true;
        // Adjusted should be higher (more weight due to offset)
        expect(adjusted.v).toBeGreaterThan(unadjusted.v);
        break;
      }
    }
    expect(foundDifference).toBe(true);
  });

  it.each([
    [
      'single-set records (effort)',
      `2024-01-01 Bench 100kg x5 @8
2024-01-05 Bench 105kg x5 @8`,
    ],
    [
      'speed-work with fallback',
      `2024-01-01 Bench 100kg x5 @8
2024-01-05 Bench (speed) 3x5 @ 85kg
2024-01-08 Bench (speed) 3x5 @ 90kg`,
    ],
  ])('generates valid models and points for %s', (_, log) => {
    const model = runPipelineModel([{ name: 'log.txt', content: log }], ath());

    // Model should be properly structured
    expect(model.model.baseline).toBeDefined();
    expect(model.model.variantFactor).toBeDefined();
    expect(model.pointsByDeriver).toBeInstanceOf(Map);
    expect(model.pointsByDeriverAdjusted).toBeInstanceOf(Map);

    // All deriver types should be present
    expect(model.pointsByDeriver.has('e1rm')).toBe(true);
    expect(model.pointsByDeriver.has('tonnage')).toBe(true);
    expect(model.pointsByDeriver.has('top-set')).toBe(true);

    // Adjusted points should also be present
    expect(model.pointsByDeriverAdjusted.has('e1rm')).toBe(true);
  });
});
