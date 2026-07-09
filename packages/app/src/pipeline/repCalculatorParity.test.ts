import { describe, it, expect } from 'vitest';
import {
  predictWeightForReps as pipelineWeightForReps,
  predictRepsForWeight as pipelineRepsForWeight,
  findBestE1RMFromPipeline,
  findCanonicalForExercise,
  selectBestE1RMPoint,
  resolveE1RMEstimate,
  convertE1RMToDisplayUnit,
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

  describe('convertE1RMToDisplayUnit', () => {
    it.each([
      ['kg passthrough', 300, 'kg', 300],
      ['lbs conversion', 100, 'lbs', 220.462262185],
      ['lbs conversion large', 300, 'lbs', 661.386786555],
    ])('%s', (_msg: string, e1rmKg: number, unit: 'lbs' | 'kg', expected: number) => {
      expect(convertE1RMToDisplayUnit(e1rmKg, unit)).toBeCloseTo(expected, 1);
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
        findBestE1RMFromPipeline('competition squat', 'competition squat', makePoints(), model, '')
      ).toBeNull();
      expect(
        findBestE1RMFromPipeline(
          'competition squat',
          'competition squat',
          [],
          model,
          'Baseline Squat'
        )
      ).toBeNull();
      expect(
        findBestE1RMFromPipeline(
          'unknown variant squat',
          'competition squat',
          makePoints(),
          model,
          'Competition Squat'
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
          'Competition Squat'
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
        'Competition Squat'
      );
      expect(exact).toMatchObject({ e1rm: 300, method: 'exact', sourceName: 'Competition Squat' });

      const factored = findBestE1RMFromPipeline(
        'high bar squat',
        'competition squat',
        makePoints(),
        model,
        'Competition Squat'
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
        'Competition Squat'
      );
      expect(offsetRes?.e1rm).toBeCloseTo(300 - 20, 1);

      const dated = findBestE1RMFromPipeline(
        'competition squat',
        'competition squat',
        makePoints(300, 1704067200000),
        model,
        'Competition Squat'
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
        'Competition Squat'
      );
      expect(clamped?.e1rm).toBe(0);
    });
  });

  describe('resolveE1RMEstimate', () => {
    const pt = (
      series: string,
      v: number,
      t: number = 1704067200000,
      tags: string[] = []
    ): Point => ({
      t,
      v,
      series,
      tags: new Set([...tags, 'lift:squat']),
    });

    const mkModel = (overrides?: Partial<NormalizationModel>): NormalizationModel => ({
      fittedAt: Date.now(),
      baseline: { 'lift:squat': 'squat' },
      variantFactor: { squat: { factor: 1.0, n: 10 } },
      addlWtOffset: {},
      ...overrides,
    });

    it.each([
      [
        'regression: display name differs from canonical',
        {
          liftType: 'squat',
          facetDisplayName: 'squat',
          baselineName: 'Comp Squat',
          model: mkModel(),
          e1rmPoints: [pt('squat', 300)],
        },
        { isNotNull: true, sourceName: 'Comp Squat', e1rm: 300 },
      ],
      [
        'no baseline entry for lift',
        {
          liftType: 'squat',
          facetDisplayName: 'squat',
          baselineName: 'Comp Squat',
          model: mkModel({ baseline: {} }),
          e1rmPoints: [pt('squat', 300)],
        },
        { isNotNull: false },
      ],
      [
        'no matching points for canonical',
        {
          liftType: 'squat',
          facetDisplayName: 'squat',
          baselineName: 'Comp Squat',
          model: mkModel(),
          e1rmPoints: [],
        },
        { isNotNull: false },
      ],
      [
        'baselineName null falls back to canonical',
        {
          liftType: 'squat',
          facetDisplayName: 'squat',
          baselineName: null,
          model: mkModel(),
          e1rmPoints: [pt('squat', 300)],
        },
        { isNotNull: true, sourceName: 'squat', e1rm: 300 },
      ],
      [
        'baselineName undefined falls back to canonical',
        {
          liftType: 'squat',
          facetDisplayName: 'squat',
          baselineName: undefined,
          model: mkModel(),
          e1rmPoints: [pt('squat', 300)],
        },
        { isNotNull: true, sourceName: 'squat', e1rm: 300 },
      ],
      [
        'points with different series',
        {
          liftType: 'squat',
          facetDisplayName: 'squat',
          baselineName: 'Comp Squat',
          model: mkModel(),
          e1rmPoints: [pt('bench', 200)],
        },
        { isNotNull: false },
      ],
    ])(
      '%s',
      (
        _msg: string,
        params: Parameters<typeof resolveE1RMEstimate>[0],
        expected: { isNotNull: boolean; sourceName?: string; e1rm?: number }
      ) => {
        const result = resolveE1RMEstimate(params);
        if (expected.isNotNull) {
          expect(result).not.toBeNull();
          expect(result?.sourceName).toBe(expected.sourceName);
          expect(result?.e1rm).toBe(expected.e1rm);
        } else {
          expect(result).toBeNull();
        }
      }
    );
  });

  describe('findCanonicalForExercise', () => {
    const pt = (series: string, t: number): Point => ({
      t,
      v: 100,
      series,
      tags: new Set(['lift:bench']),
    });

    const model: NormalizationModel = {
      fittedAt: Date.now(),
      baseline: { 'lift:bench': 'bench' },
      variantFactor: {
        'bench-american': { factor: 0.75, n: 1 },
        bench: { factor: 1.0, n: 5 },
      },
      addlWtOffset: {},
    };

    it('prefers an exact canonical match over an earlier substring match (regression: bare exercise mismatched to a compound variant)', () => {
      // "bench-american" is chronologically first (and thus first in Set iteration
      // order) and contains "bench" as a substring — a naive first-match substring
      // scan would incorrectly resolve the bare "Bench" display name to it instead
      // of the exact "bench" canonical, projecting through variantFactor and
      // silently under-predicting e1RM (see RepCalculator bug report: displayed
      // e1RM of 125lbs vs. the true ~148lbs best straight-bench session).
      const e1rmPoints = [pt('bench-american', 1) /* earliest */, pt('bench', 2)];
      expect(findCanonicalForExercise('Bench', 'bench', model, e1rmPoints, 'bench')).toBe('bench');
    });

    it.each([
      [
        'substring fallback still matches when no exact canonical exists',
        [pt('bench-close', 1)],
        'Close',
        'bench-close',
      ],
      [
        'falls back to baseline when nothing matches by name or variantFactor',
        [pt('bench', 1)],
        'Deadlift',
        'bench',
      ],
    ])('%s', (_msg: string, e1rmPoints: Point[], displayName: string, expected: string) => {
      expect(findCanonicalForExercise(displayName, 'bench', model, e1rmPoints, 'bench')).toBe(
        expected
      );
    });
  });
});
