import { describe, it, expect } from 'vitest';
import {
  predictWeightForReps as pipelineWeightForReps,
  predictRepsForWeight as pipelineRepsForWeight,
  findBestE1RMFromPipeline,
  selectBestE1RMPoint,
} from './repCalculatorUtils';
import {
  predictWeightForReps as coreWeightForReps,
  predictRepsForWeight as coreRepsForWeight,
} from '@dyel/core';
import type { Point, NormalizationModel } from '@dyel/pipeline';

describe('RepCalculator parity: legacy vs pipeline', () => {
  describe('predictWeightForReps', () => {
    it.each([
      ['baseline: e1rm=300, 1 rep', 300, 1, 300],
      ['baseline: e1rm=300, 3 reps', 300, 3, 273],
      ['baseline: e1rm=300, 5 reps', 300, 5, 257],
      ['baseline: e1rm=300, 10 reps', 300, 10, 225],
      ['zero reps returns 0', 300, 0, 0],
      ['negative reps returns 0', 300, -1, 0],
    ])('%s', (_, e1rm, reps, expectedApprox) => {
      const legacy = coreWeightForReps(e1rm, reps);
      const pipeline = pipelineWeightForReps(e1rm, reps);

      // Both implementations should be nearly identical
      expect(pipeline).toBeCloseTo(legacy, 1);
      expect(Math.round(pipeline)).toBe(Math.round(expectedApprox));
    });
  });

  describe('predictRepsForWeight', () => {
    it.each([
      ['e1rm=300, weight=300 (equal) → 1 rep', 300, 300, 1],
      ['e1rm=300, weight=250 → 6 reps', 300, 250, 6],
      ['e1rm=300, weight=200 → 15 reps', 300, 200, 15],
      ['e1rm=300, weight=150 → 30 reps', 300, 150, 30],
      ['zero weight returns 1', 300, 0, 1],
      ['negative weight returns 1', 300, -10, 1],
      ['weight >= e1rm returns 1', 300, 300, 1],
    ])('%s', (_, e1rm, weight, expectedApprox) => {
      const legacy = coreRepsForWeight(e1rm, weight);
      const pipeline = pipelineRepsForWeight(e1rm, weight);

      // Both implementations should be nearly identical
      expect(pipeline).toBeCloseTo(legacy, 1);
      expect(Math.abs(pipeline - expectedApprox)).toBeLessThan(0.1);
    });
  });

  describe('selectBestE1RMPoint', () => {
    it('returns null for empty points array', () => {
      expect(selectBestE1RMPoint([])).toBeNull();
    });

    it('selects the point with maximum e1rm value', () => {
      const points: Point[] = [
        { t: 1704067200000, v: 250, series: 'squat', tags: new Set(['lift:squat']) },
        { t: 1704153600000, v: 280, series: 'squat', tags: new Set(['lift:squat']) },
        { t: 1704240000000, v: 270, series: 'squat', tags: new Set(['lift:squat']) },
      ];

      const result = selectBestE1RMPoint(points);
      expect(result).not.toBeNull();
      expect(result!.e1rm).toBe(280);
      expect(result!.t).toBe(1704153600000);
    });

    it('handles points with all identical values', () => {
      const points: Point[] = [
        { t: 1704067200000, v: 250, series: 'bench', tags: new Set(['lift:bench']) },
        { t: 1704153600000, v: 250, series: 'bench', tags: new Set(['lift:bench']) },
      ];

      const result = selectBestE1RMPoint(points);
      expect(result).not.toBeNull();
      expect(result!.e1rm).toBe(250);
      expect(result!.t).toBe(1704067200000); // First point with max value
    });
  });

  describe('findBestE1RMFromPipeline', () => {
    const model: NormalizationModel = {
      fittedAt: Date.now(),
      baseline: { 'lift:squat': 'competition squat' },
      variantFactor: {
        'competition squat': { factor: 1.0, n: 10 },
        'high bar squat': { factor: 0.95, n: 8 },
        'pause squat': { factor: 0.88, n: 5 },
      },
      addlWtOffset: {
        'competition squat chains': { offsetKg: 15, n: 4 },
      },
    };

    it('returns null if no baseline source name provided', () => {
      const points: Point[] = [
        { t: 1704067200000, v: 300, series: 'competition squat', tags: new Set(['lift:squat']) },
      ];

      const result = findBestE1RMFromPipeline(
        'competition squat',
        'competition squat',
        points,
        model,
        '',
        new Date()
      );
      expect(result).toBeNull();
    });

    it('returns null if no baseline e1rm points', () => {
      const result = findBestE1RMFromPipeline(
        'competition squat',
        'competition squat',
        [],
        model,
        'Baseline Squat',
        new Date()
      );
      expect(result).toBeNull();
    });

    it('returns exact e1rm when target equals baseline', () => {
      const points: Point[] = [
        { t: 1704067200000, v: 250, series: 'competition squat', tags: new Set(['lift:squat']) },
        { t: 1704153600000, v: 300, series: 'competition squat', tags: new Set(['lift:squat']) },
      ];

      const result = findBestE1RMFromPipeline(
        'competition squat',
        'competition squat',
        points,
        model,
        'Competition Squat',
        new Date()
      );

      expect(result).not.toBeNull();
      expect(result!.e1rm).toBe(300);
      expect(result!.method).toBe('exact');
      expect(result!.sourceName).toBe('Competition Squat');
    });

    it('applies variant factor to baseline e1rm for target exercise', () => {
      const points: Point[] = [
        { t: 1704067200000, v: 300, series: 'competition squat', tags: new Set(['lift:squat']) },
      ];

      const result = findBestE1RMFromPipeline(
        'high bar squat',
        'competition squat',
        points,
        model,
        'Competition Squat',
        new Date()
      );

      expect(result).not.toBeNull();
      expect(result!.e1rm).toBeCloseTo(300 * 0.95, 1); // 285
      expect(result!.method).toBe('variantFactor');
    });

    it('subtracts addlWt offset from projected e1rm', () => {
      const points: Point[] = [
        { t: 1704067200000, v: 300, series: 'competition squat', tags: new Set(['lift:squat']) },
      ];

      // Create a model with an offset for a chained variant
      const modelWithOffset: NormalizationModel = {
        ...model,
        variantFactor: {
          ...model.variantFactor,
          'competition squat chains': { factor: 1.0, n: 4 },
        },
        addlWtOffset: {
          'competition squat chains': { offsetKg: 20, n: 4 },
        },
      };

      const result = findBestE1RMFromPipeline(
        'competition squat chains',
        'competition squat',
        points,
        modelWithOffset,
        'Competition Squat',
        new Date()
      );

      expect(result).not.toBeNull();
      expect(result!.e1rm).toBeCloseTo(300 - 20, 1); // 280 = 300*1.0 - 20
      expect(result!.method).toBe('variantFactor');
    });

    it('returns null when variant factor is missing or invalid', () => {
      const points: Point[] = [
        { t: 1704067200000, v: 300, series: 'competition squat', tags: new Set(['lift:squat']) },
      ];

      const result = findBestE1RMFromPipeline(
        'unknown variant squat',
        'competition squat',
        points,
        model,
        'Competition Squat',
        new Date()
      );

      expect(result).toBeNull();
    });

    it('returns null when variant factor is <= 0', () => {
      const modelWithBadFactor: NormalizationModel = {
        ...model,
        variantFactor: {
          ...model.variantFactor,
          'bad squat': { factor: 0, n: 2 },
        },
      };

      const points: Point[] = [
        { t: 1704067200000, v: 300, series: 'competition squat', tags: new Set(['lift:squat']) },
      ];

      const result = findBestE1RMFromPipeline(
        'bad squat',
        'competition squat',
        points,
        modelWithBadFactor,
        'Competition Squat',
        new Date()
      );

      expect(result).toBeNull();
    });

    it('preserves baseline date in result', () => {
      const baselineTime = 1704067200000; // 2024-01-01
      const points: Point[] = [
        { t: baselineTime, v: 300, series: 'competition squat', tags: new Set(['lift:squat']) },
      ];

      const result = findBestE1RMFromPipeline(
        'competition squat',
        'competition squat',
        points,
        model,
        'Competition Squat',
        new Date()
      );

      expect(result).not.toBeNull();
      expect(result!.date.getTime()).toBe(baselineTime);
    });

    it('clamps negative offset result to 0', () => {
      const modelWithLargeOffset: NormalizationModel = {
        ...model,
        variantFactor: {
          ...model.variantFactor,
          'light squat': { factor: 1.0, n: 2 },
        },
        addlWtOffset: {
          'light squat': { offsetKg: 350, n: 2 }, // Larger than baseline e1rm
        },
      };

      const points: Point[] = [
        { t: 1704067200000, v: 300, series: 'competition squat', tags: new Set(['lift:squat']) },
      ];

      const result = findBestE1RMFromPipeline(
        'light squat',
        'competition squat',
        points,
        modelWithLargeOffset,
        'Competition Squat',
        new Date()
      );

      expect(result).not.toBeNull();
      expect(result!.e1rm).toBe(0); // Math.max(0, 300 - 350)
    });
  });
});
