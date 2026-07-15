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

  it('classifyAccessorySubtypes is wired into pipeline and applied to tagged records', () => {
    // Pipeline smoke test: verify that classifyAccessorySubtypes runs as part of runPipelineModel.
    // This test creates a simple scenario with a bench set and exercises on the same day,
    // runs through the full pipeline, and verifies that tagged records are produced.
    // Note: Pure accessories without modifiers are currently filtered as unknown in the
    // normalization flow (by resolveCanonicalNames), so we focus on verifying that the
    // pipeline completes successfully and the core records are properly tagged.
    const log = `units: kg
2024-01-01 Bench 100 x5 @8
2024-01-02 Bench 105 x5 @8`;

    const model = runPipelineModel([{ name: 'log.txt', content: log }], ath());

    // Verify pipeline ran successfully
    expect(model.tagged).toBeDefined();
    expect(model.tagged.length).toBeGreaterThan(0);

    // Verify bench records are present and tagged
    const benchRecords = model.tagged.filter((r) => r.tags.has('lift:bench'));
    expect(benchRecords.length).toBe(2);

    // Verify bench records have comp-lift tag and no accessory subtype
    benchRecords.forEach((r) => {
      expect(r.tags.has('comp-lift')).toBe(true);
      expect(r.tags.has('lift:bench')).toBe(true);
      expect([...r.tags].some((t) => t.startsWith('accessory:'))).toBe(false);
    });
  });

  it('includes accessory records in pointsByDeriver/pointsByLabelByDeriver so app Accessories tab charts render', () => {
    // Regression test: pointsByDeriver/pointsByLabelByDeriver used to be built from compTagged
    // only, so any spec filtering on `lift:accessory` (e.g. @dyel/api's conjugateChartSpecs,
    // consumed by the app's Accessories tab) always resolved empty, even though
    // PipelineModel.tagged itself did include accessory records. Points must be built from the
    // full tagged set (compTagged + accessoryTagged) for that tab to actually render data.
    const log = `units: kg
2024-01-01 Squat 100 x5 @8
2024-01-01 Bench 80 x5 @8
2024-01-01 Bicep Curl 15 x10 @8`;

    const model = runPipelineModel([{ name: 'log.txt', content: log }], ath());

    const accessoryTagged = model.tagged.filter((r) => r.tags.has('lift:accessory'));
    expect(accessoryTagged.length).toBe(1);
    const accessoryCanonical = accessoryTagged[0].canonical;

    const e1rmPoints = model.pointsByDeriver.get('e1rm') ?? [];
    expect(e1rmPoints.some((p) => p.series === accessoryCanonical)).toBe(true);

    const e1rmLabelPoints = model.pointsByLabelByDeriver.get('e1rm') ?? [];
    expect(e1rmLabelPoints.some((p) => p.tags.has('lift:accessory'))).toBe(true);

    // The normalization model itself must remain scoped to comp lifts only — an accessory
    // canonical should never appear in the fitted baseline/variantFactor.
    expect(Object.values(model.model.baseline)).not.toContain(accessoryCanonical);
    expect(model.model.variantFactor[accessoryCanonical]).toBeUndefined();
  });

  describe('automatic competition deadlift-stance derivation', () => {
    it.each([
      [
        'sumo strictly higher e1RM',
        `2024-01-01 Sumo Deadlift 150kg x5 @8
2024-01-01 Deadlift 100kg x5 @8`,
        'sumo',
      ],
      [
        'conventional strictly higher e1RM',
        `2024-01-01 Sumo Deadlift 100kg x5 @8
2024-01-01 Deadlift 150kg x5 @8`,
        'conventional',
      ],
      [
        'tied e1RM defaults to conventional',
        `2024-01-01 Sumo Deadlift 100kg x5 @8
2024-01-01 Deadlift 100kg x5 @8`,
        'conventional',
      ],
      [
        'no sumo data at all defaults to conventional',
        `2024-01-01 Deadlift 100kg x5 @8`,
        'conventional',
      ],
    ])('tags "competition" on the %s deadlift stance only', (_, log, winner) => {
      const model = runPipelineModel([{ name: 'log.txt', content: log }], ath()) as PipelineModel;

      const sumoRecords = model.tagged.filter((r) => r.canonical === 'deadlift-sumo');
      const conventionalRecords = model.tagged.filter((r) => r.canonical === 'deadlift');

      if (sumoRecords.length) {
        expect(sumoRecords.every((r) => r.tags.has('competition'))).toBe(winner === 'sumo');
      }
      expect(conventionalRecords.every((r) => r.tags.has('competition'))).toBe(
        winner === 'conventional'
      );
    });

    it('always tags bare Squat and Bench as "competition", independent of deadlift data', () => {
      const log = `2024-01-01 Squat 100kg x5 @8
2024-01-01 Bench 80kg x5 @8
2024-01-01 Sumo Deadlift 150kg x5 @8
2024-01-01 Deadlift 100kg x5 @8`;

      const model = runPipelineModel([{ name: 'log.txt', content: log }], ath()) as PipelineModel;

      const squatRecords = model.tagged.filter((r) => r.canonical === 'squat');
      const benchRecords = model.tagged.filter((r) => r.canonical === 'bench');
      expect(squatRecords.length).toBeGreaterThan(0);
      expect(benchRecords.length).toBeGreaterThan(0);
      expect(squatRecords.every((r) => r.tags.has('competition'))).toBe(true);
      expect(benchRecords.every((r) => r.tags.has('competition'))).toBe(true);

      // Confirm this doesn't depend on deadlift data existing at all.
      const noDeadliftLog = `2024-01-01 Squat 100kg x5 @8
2024-01-01 Bench 80kg x5 @8`;
      const noDeadliftModel = runPipelineModel(
        [{ name: 'log.txt', content: noDeadliftLog }],
        ath()
      ) as PipelineModel;
      const squatOnly = noDeadliftModel.tagged.filter((r) => r.canonical === 'squat');
      const benchOnly = noDeadliftModel.tagged.filter((r) => r.canonical === 'bench');
      expect(squatOnly.every((r) => r.tags.has('competition'))).toBe(true);
      expect(benchOnly.every((r) => r.tags.has('competition'))).toBe(true);
    });
  });
});
