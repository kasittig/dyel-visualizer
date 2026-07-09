import { describe, it, expect } from 'vitest';
import {
  predictWeightForReps as pipelineWeightForReps,
  predictRepsForWeight as pipelineRepsForWeight,
  findBestE1RMFromPipeline,
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

    const ptBench = (
      series: string,
      v: number,
      t: number = 1704067200000,
      tags: string[] = []
    ): Point => ({
      t,
      v,
      series,
      tags: new Set([...tags, 'lift:bench']),
    });

    it.each([
      [
        'exact match: baseline canonical',
        {
          liftType: 'squat',
          targetCanonical: 'squat',
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
          targetCanonical: 'squat',
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
          targetCanonical: 'squat',
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
          targetCanonical: 'squat',
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
          targetCanonical: 'squat',
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
          targetCanonical: 'squat',
          baselineName: 'Comp Squat',
          model: mkModel(),
          e1rmPoints: [pt('bench', 200)],
        },
        { isNotNull: false },
      ],
      [
        'variant canonical with variant factor',
        {
          liftType: 'squat',
          targetCanonical: 'squat-pause',
          baselineName: 'Comp Squat',
          model: mkModel({
            variantFactor: { squat: { factor: 1.0, n: 10 }, 'squat-pause': { factor: 0.88, n: 5 } },
          }),
          e1rmPoints: [pt('squat', 300)],
        },
        { isNotNull: true, sourceName: 'Comp Squat', e1rm: 264, method: 'variantFactor' },
      ],
    ])(
      '%s',
      (
        _msg: string,
        params: Parameters<typeof resolveE1RMEstimate>[0],
        expected: { isNotNull: boolean; sourceName?: string; e1rm?: number; method?: string }
      ) => {
        const result = resolveE1RMEstimate(params);
        if (expected.isNotNull) {
          expect(result).not.toBeNull();
          expect(result?.sourceName).toBe(expected.sourceName);
          if (expected.e1rm !== undefined) {
            expect(result?.e1rm).toBeCloseTo(expected.e1rm, 1);
          }
          if (expected.method) {
            expect(result?.method).toBe(expected.method);
          }
        } else {
          expect(result).toBeNull();
        }
      }
    );

    it('distinguishes equipment magnitude (1-board vs 2-board) with distinct variant factors', () => {
      const baselineCompBench = 300;
      const benchBoardModel: NormalizationModel = {
        fittedAt: Date.now(),
        baseline: { 'lift:bench': 'bench' },
        variantFactor: {
          bench: { factor: 1.0, n: 20 },
          'bench-board': { factor: 0.95, n: 10 },
          'bench-board-2': { factor: 0.98, n: 8 },
        },
        addlWtOffset: {},
      };

      const baselinePoints = [ptBench('bench', baselineCompBench)];

      const estimate1Board = resolveE1RMEstimate({
        liftType: 'bench',
        targetCanonical: 'bench-board',
        baselineName: 'Competition Bench',
        model: benchBoardModel,
        e1rmPoints: baselinePoints,
      });

      const estimate2Board = resolveE1RMEstimate({
        liftType: 'bench',
        targetCanonical: 'bench-board-2',
        baselineName: 'Competition Bench',
        model: benchBoardModel,
        e1rmPoints: baselinePoints,
      });

      // Both should resolve successfully
      expect(estimate1Board).not.toBeNull();
      expect(estimate2Board).not.toBeNull();

      // 1-board and 2-board should produce distinct e1RM estimates
      expect(estimate1Board?.e1rm).not.toBeCloseTo(estimate2Board?.e1rm ?? 0, 0);

      // 2-board (shorter ROM, factor 0.98) should estimate higher than 1-board (factor 0.95)
      expect(estimate2Board?.e1rm).toBeGreaterThan(estimate1Board?.e1rm ?? 0);

      // Verify the actual computed values match expected factors
      expect(estimate1Board?.e1rm).toBeCloseTo(baselineCompBench * 0.95, 1);
      expect(estimate2Board?.e1rm).toBeCloseTo(baselineCompBench * 0.98, 1);

      // Both should use variantFactor method
      expect(estimate1Board?.method).toBe('variantFactor');
      expect(estimate2Board?.method).toBe('variantFactor');
    });

    it('distinguishes equipment magnitude for deficit and blocks variations', () => {
      const baselineDL = 500;
      const deficitBlocksModel: NormalizationModel = {
        fittedAt: Date.now(),
        baseline: { 'lift:deadlift': 'deadlift' },
        variantFactor: {
          deadlift: { factor: 1.0, n: 25 },
          'deadlift-deficit': { factor: 0.92, n: 12 },
          'deadlift-deficit-2': { factor: 0.88, n: 8 },
          'deadlift-blocks': { factor: 1.05, n: 15 },
          'deadlift-blocks-2': { factor: 1.08, n: 10 },
        },
        addlWtOffset: {},
      };

      const baselinePoints = [
        { t: 1704067200000, v: baselineDL, series: 'deadlift', tags: new Set(['lift:deadlift']) },
      ];

      const estimates = [
        ['deadlift-deficit', 0.92],
        ['deadlift-deficit-2', 0.88],
        ['deadlift-blocks', 1.05],
        ['deadlift-blocks-2', 1.08],
      ].map(([canonical]) =>
        resolveE1RMEstimate({
          liftType: 'deadlift',
          targetCanonical: canonical,
          baselineName: 'Competition Deadlift',
          model: deficitBlocksModel,
          e1rmPoints: baselinePoints,
        })
      );

      // All should resolve successfully
      estimates.forEach((est) => {
        expect(est).not.toBeNull();
        expect(est?.method).toBe('variantFactor');
      });

      // Deficit estimates should be lower than blocks estimates
      expect(estimates[0]?.e1rm).toBeLessThan(estimates[2]?.e1rm ?? 0);
      expect(estimates[1]?.e1rm).toBeLessThan(estimates[2]?.e1rm ?? 0);

      // Within-group magnitudes should be ordered (smaller magnitude = lower estimate)
      expect(estimates[0]?.e1rm).toBeGreaterThan(estimates[1]?.e1rm ?? 0);
      expect(estimates[3]?.e1rm).toBeGreaterThan(estimates[2]?.e1rm ?? 0);

      // Verify exact computed values
      expect(estimates[0]?.e1rm).toBeCloseTo(baselineDL * 0.92, 1);
      expect(estimates[1]?.e1rm).toBeCloseTo(baselineDL * 0.88, 1);
      expect(estimates[2]?.e1rm).toBeCloseTo(baselineDL * 1.05, 1);
      expect(estimates[3]?.e1rm).toBeCloseTo(baselineDL * 1.08, 1);
    });
  });
});
