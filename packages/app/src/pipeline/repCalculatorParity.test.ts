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
      ['1 rep', 300, 1, 300],
      ['3 reps', 300, 3, 273],
      ['5 reps', 300, 5, 257],
      ['10 reps', 300, 10, 225],
      ['0 reps', 300, 0, 0],
      ['neg reps', 300, -1, 0],
    ])('%s', (_msg: string, e1rm: number, reps: number, expected: number) => {
      const legacy = coreWeightForReps(e1rm, reps);
      const pipeline = pipelineWeightForReps(e1rm, reps);
      expect(pipeline).toBeCloseTo(legacy, 1);
      expect(Math.round(pipeline)).toBe(Math.round(expected));
    });
  });

  describe('predictRepsForWeight', () => {
    it.each([
      ['equal', 300, 300, 1],
      ['250wt', 300, 250, 6],
      ['200wt', 300, 200, 15],
      ['150wt', 300, 150, 30],
      ['0wt', 300, 0, 1],
      ['neg wt', 300, -10, 1],
      ['over wt', 300, 350, 1],
    ])('%s', (_msg: string, e1rm: number, weight: number, expected: number) => {
      const legacy = coreRepsForWeight(e1rm, weight);
      const pipeline = pipelineRepsForWeight(e1rm, weight);
      expect(pipeline).toBeCloseTo(legacy, 1);
      expect(Math.abs(pipeline - expected)).toBeLessThan(0.1);
    });
  });

  describe('selectBestE1RMPoint', () => {
    it('handles empty arrays, maximum lookups, and identical value ties', () => {
      expect(selectBestE1RMPoint([])).toBeNull();

      const pts: Point[] = [
        { t: 1704067200000, v: 250, series: 'squat', tags: new Set(['lift:squat']) },
        { t: 1704153600000, v: 280, series: 'squat', tags: new Set(['lift:squat']) },
        { t: 1704240000000, v: 270, series: 'squat', tags: new Set(['lift:squat']) },
      ];
      expect(selectBestE1RMPoint(pts)).toMatchObject({ e1rm: 280, t: 1704153600000 });

      const samePts: Point[] = [
        { t: 1704067200000, v: 250, series: 'bench', tags: new Set(['lift:bench']) },
        { t: 1704153600000, v: 250, series: 'bench', tags: new Set(['lift:bench']) },
      ];
      expect(selectBestE1RMPoint(samePts)).toMatchObject({ e1rm: 250, t: 1704067200000 });
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
      addlWtOffset: { 'competition squat chains': { offsetKg: 15, n: 4 } },
    };
    const makePoints = (v = 300, t = 1704067200000): Point[] => {
      return [{ t, v, series: 'competition squat', tags: new Set(['lift:squat']) }];
    };

    it('returns null on missing inputs or variant validation failures', () => {
      expect(
        findBestE1RMFromPipeline(
          'competition squat',
          'competition squat',
          makePoints(),
          model,
          '',
          new Date()
        )
      ).toBeNull();
      expect(
        findBestE1RMFromPipeline(
          'competition squat',
          'competition squat',
          [],
          model,
          'Baseline Squat',
          new Date()
        )
      ).toBeNull();
      expect(
        findBestE1RMFromPipeline(
          'unknown variant squat',
          'competition squat',
          makePoints(),
          model,
          'Competition Squat',
          new Date()
        )
      ).toBeNull();

      const badFactorModel = {
        ...model,
        variantFactor: { ...model.variantFactor, 'bad squat': { factor: 0, n: 2 } },
      };
      expect(
        findBestE1RMFromPipeline(
          'bad squat',
          'competition squat',
          makePoints(),
          badFactorModel,
          'Competition Squat',
          new Date()
        )
      ).toBeNull();
    });

    it('projects valid matching values, structural scales, date captures, and clamps values', () => {
      // Fix TS2554: Added generic string typed Set boundaries to match accurate pipeline Point specs
      const exactPts: Point[] = [
        { t: 1704067200000, v: 250, series: 'comp', tags: new Set<string>(['lift:squat']) },
        { t: 1704153600000, v: 300, series: 'comp', tags: new Set<string>(['lift:squat']) },
      ];
      const exact = findBestE1RMFromPipeline(
        'competition squat',
        'competition squat',
        exactPts,
        model,
        'Competition Squat',
        new Date()
      );
      expect(exact).toMatchObject({ e1rm: 300, method: 'exact', sourceName: 'Competition Squat' });

      const factored = findBestE1RMFromPipeline(
        'high bar squat',
        'competition squat',
        makePoints(),
        model,
        'Competition Squat',
        new Date()
      );
      expect(factored?.e1rm).toBeCloseTo(300 * 0.95, 1);
      expect(factored?.method).toBe('variantFactor');

      const offsetModel = {
        ...model,
        variantFactor: {
          ...model.variantFactor,
          'competition squat chains': { factor: 1.0, n: 4 },
        },
        addlWtOffset: { 'competition squat chains': { offsetKg: 20, n: 4 } },
      };
      const offsetRes = findBestE1RMFromPipeline(
        'competition squat chains',
        'competition squat',
        makePoints(),
        offsetModel,
        'Competition Squat',
        new Date()
      );
      expect(offsetRes?.e1rm).toBeCloseTo(300 - 20, 1);

      const dated = findBestE1RMFromPipeline(
        'competition squat',
        'competition squat',
        makePoints(300, 1704067200000),
        model,
        'Competition Squat',
        new Date()
      );
      expect(dated?.date.getTime()).toBe(1704067200000);

      const clampModel = {
        ...model,
        variantFactor: { ...model.variantFactor, 'light squat': { factor: 1.0, n: 2 } },
        addlWtOffset: { 'light squat': { offsetKg: 350, n: 2 } },
      };
      const clamped = findBestE1RMFromPipeline(
        'light squat',
        'competition squat',
        makePoints(),
        clampModel,
        'Competition Squat',
        new Date()
      );
      expect(clamped?.e1rm).toBe(0);
    });
  });
});
