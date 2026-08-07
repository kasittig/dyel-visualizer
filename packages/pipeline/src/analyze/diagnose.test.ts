import { describe, it, expect } from 'vitest';
import { diagnose } from './diagnose';
import type { NormalizationModel } from '../derive/normalize';
import type { Point } from '../types';

const day = (n: number) => Date.now() - (30 - n) * 86400000;
const pt = (s: string, v: number, t: number, tags: string[] = []): Point => ({
  t,
  v,
  series: s,
  tags: new Set(['lift:bench', ...tags]),
});

const map = new Map([
  ['bench', []],
  ['bench-chains', ['lockout']],
  ['bench-close-grip', ['lockout', 'tricep']],
  ['bench-paused', ['off-chest']],
]);
const basePt = pt('bench', 100, day(20));
const opts = { tolerance: 0.05, staleDays: 30 };

const model: NormalizationModel = {
  fittedAt: day(1),
  baseline: { 'lift:bench': 'bench' },
  addlWtOffset: {},
  variantFactor: {
    'bench-chains': { factor: 0.8, n: 5 },
    'bench-close-grip': { factor: 0.9, n: 5 },
    'bench-paused': { factor: 0.85, n: 5 },
  },
};

describe('diagnose evaluations', () => {
  it('assesses baseline optimal bounds and variant metrics correctly', () => {
    const report = diagnose([basePt], model, map, opts, undefined);
    expect(report.variants[0]).toMatchObject({
      canonical: 'bench',
      ratio: 1,
      status: 'optimal',
      fittedStatus: null,
      observationCount: 1,
      comparisonCount: null,
    });

    const checks = [
      [70, 'weakness', 0.875],
      [90, 'overperforming', 1.125],
      [82, 'optimal', 1.025],
    ] as const;
    checks.forEach(([v, status, ratio]) => {
      const res = diagnose([basePt, pt('bench-chains', v, day(20))], model, map, opts, undefined);
      const variant = res.variants.find((x) => x.canonical === 'bench-chains')!;
      expect(variant.status).toBe(status);
      expect(variant.ratio).toBeCloseTo(ratio, 3);
    });

    const stale = diagnose(
      [basePt, pt('bench-chains', 80, Date.now() - 40 * 86400000)],
      model,
      map,
      opts,
      undefined
    );
    expect(stale.variants.find((v) => v.canonical === 'bench-chains')?.status).toBe('stale');
    expect(stale.unassessed).toEqual([]);

    expect(
      diagnose(
        [basePt, pt('bench-bands', 70, day(20))],
        model,
        map,
        opts,
        undefined,
        new Map([['bench-bands', 'Bench (Bands)']])
      ).unassessed
    ).toEqual([
      {
        canonical: 'bench-bands',
        displayName: 'Bench (Bands)',
        lift: 'lift:bench',
        reason: 'missing-factor',
      },
    ]);
  });

  it('includes calculation, trend, and evidence provenance', () => {
    const earlier = pt('bench-chains', 75, day(10));
    const latest = pt('bench-chains', 80, day(20));
    const assessment = diagnose(
      [basePt, earlier, latest],
      model,
      map,
      opts,
      undefined
    ).variants.find((variant) => variant.canonical === 'bench-chains');

    expect(assessment).toMatchObject({
      baselineE1rmKg: 100,
      expectedFactor: 0.8,
      latestAt: latest.t,
      previousE1rmKg: 75,
      observationCount: 2,
      comparisonCount: 5,
    });
  });

  it.each([
    [
      'explicit exercise limit',
      {
        date: basePt.t,
        sourceText: 'Shoulder pain, unable to bench',
        matchedText: 'Shoulder pain, unable to bench',
        limitation: 'unable to bench',
        relatedExercise: 'bench press',
      },
      1,
    ],
    [
      'ambiguous session symptom',
      {
        date: basePt.t,
        sourceText: 'Shoulder pain today',
        matchedText: 'Shoulder pain today',
        region: 'shoulder',
      },
      0,
    ],
    [
      'explicit training limit',
      {
        date: basePt.t,
        sourceText: 'Knee pain after squats, had to cut training short',
        matchedText: 'Knee pain after squats, had to cut training short',
        limitation: 'had to cut training short',
        relatedExercise: 'squat',
      },
      1,
    ],
    [
      'different-day explicit limit',
      {
        date: basePt.t + 86400000,
        sourceText: 'Shoulder pain, unable to bench',
        matchedText: 'Shoulder pain, unable to bench',
        limitation: 'unable to bench',
        relatedExercise: 'bench press',
      },
      0,
    ],
  ])('keeps %s as structured same-day symptom context', (_, event, limitingCount) => {
    const before = diagnose([basePt], model, map, opts, undefined);
    const after = diagnose([basePt], model, map, opts, undefined, new Map(), new Map(), new Map(), [
      event,
    ]);

    expect(after.variants[0].symptomContext.events).toHaveLength(event.date === basePt.t ? 1 : 0);
    expect(after.variants[0].symptomContext.limitingEvents).toHaveLength(limitingCount);
    expect(after.variants[0]).toMatchObject({
      actualE1rmKg: before.variants[0].actualE1rmKg,
      ratio: before.variants[0].ratio,
      status: before.variants[0].status,
    });
    expect(after.weaknesses).toEqual(before.weaknesses);
  });

  it.each([
    [
      'missing normalization factor',
      [basePt, pt('bench-bands', 70, day(20))],
      model,
      'missing-factor',
      'lift:bench',
    ],
    [
      'missing competition baseline observation',
      [
        {
          ...pt('squat-pause', 100, day(20)),
          tags: new Set(['lift:squat']),
        },
      ],
      {
        ...model,
        baseline: { ...model.baseline, 'lift:squat': 'squat' },
        variantFactor: { ...model.variantFactor, 'squat-pause': { factor: 0.9, n: 2 } },
      },
      'missing-baseline',
      'lift:squat',
    ],
  ] as const)('records a structured reason for %s', (_, points, testModel, reason, lift) => {
    expect(diagnose([...points], testModel, map, opts, undefined).unassessed[0]).toMatchObject({
      reason,
      lift,
    });
  });

  it('aggregates weaknesses and filters out stale or sub-zero metrics', () => {
    const fresh = diagnose(
      [
        basePt,
        pt('bench-chains', 70, day(20)),
        pt('bench-close-grip', 80, day(20)),
        pt('bench-paused', 95, day(20)),
      ],
      model,
      map,
      opts,
      undefined
    );
    expect(fresh.weaknesses).toEqual([
      { quality: 'lockout', score: 2, evidence: ['bench-chains', 'bench-close-grip'] },
      { quality: 'tricep', score: 1, evidence: ['bench-close-grip'] },
    ]);

    expect(
      diagnose([basePt, pt('bench-chains', 90, day(20))], model, map, opts, undefined).weaknesses
    ).toEqual([]);

    const mixed = diagnose(
      [
        basePt,
        pt('bench-chains', 70, Date.now() - 40 * 86400000),
        pt('bench-close-grip', 80, day(20)),
      ],
      model,
      map,
      opts,
      undefined
    );
    expect(mixed.weaknesses).toEqual([
      { quality: 'lockout', score: 1, evidence: ['bench-close-grip'] },
      { quality: 'tricep', score: 1, evidence: ['bench-close-grip'] },
    ]);
  });

  it('handles addlWtOffset contexts and processes expected baseline ranges', () => {
    const activeWt = diagnose(
      [basePt, pt('bench-chains', 80, day(20))],
      { ...model, addlWtOffset: { 'bench-chains': { offsetKg: 11.34, n: 5 } } },
      map,
      opts,
      undefined
    ).variants.find((v) => v.canonical === 'bench-chains');
    expect(activeWt?.addlWtOffset?.offsetKg).toBe(11.34);
    expect(activeWt?.actualE1rmKg).toBe(80);
    expect(activeWt?.expectedE1rmKg).toBeCloseTo(68.66);

    const emptyWt = diagnose(
      [basePt, pt('bench-chains', 80, day(20))],
      { ...model, addlWtOffset: { 'bench-chains': { offsetKg: 11.34, n: 0 } } },
      map,
      opts,
      undefined
    ).variants.find((v) => v.canonical === 'bench-chains');
    expect(emptyWt?.addlWtOffset).toBeUndefined();

    const boardModel = {
      ...model,
      variantFactor: {
        'bench-board': { factor: 1.05, n: 5 },
        'bench-board-2': { factor: 1.15, n: 5 },
      },
    };
    const ranges = new Map([
      ['bench-board', { min: 105, max: 115 }],
      ['bench-board-2', { min: 115, max: 125 }],
    ]);
    const boards = diagnose(
      [basePt, pt('bench-board', 100, day(20)), pt('bench-board-2', 110, day(20))],
      boardModel,
      map,
      opts,
      undefined,
      new Map(),
      ranges
    );
    expect(boards.variants.find((v) => v.canonical === 'bench-board')?.expectedBaseline).toBe(
      '105-115%'
    );
    expect(boards.variants.find((v) => v.canonical === 'bench-board-2')?.expectedBaseline).toBe(
      '115-125%'
    );

    const unmapped = diagnose(
      [basePt, pt('bench-board-4', 140, day(20))],
      { ...model, variantFactor: { 'bench-board-4': { factor: 1.35, n: 3 } } },
      map,
      opts,
      undefined,
      new Map(),
      new Map()
    );
    expect(
      unmapped.variants.find((v) => v.canonical === 'bench-board-4')?.expectedBaseline
    ).toBeNull();
  });

  it.each([
    ['agreement', 0.8, 70, { min: 90, max: 110 }, 'weakness', 'weakness'],
    ['disagreement', 1.2, 105, { min: 90, max: 110 }, 'weakness', 'overperforming'],
    ['current high, fitted in range', 1, 110, { min: 90, max: 110 }, 'overperforming', 'optimal'],
  ] as const)(
    'separates current and fitted status: %s',
    (_, factor, actual, range, status, fittedStatus) => {
      expect(
        diagnose(
          [basePt, pt('bench-chains', actual, day(20))],
          { ...model, variantFactor: { 'bench-chains': { factor, n: 5 } } },
          map,
          opts,
          undefined,
          new Map(),
          new Map([['bench-chains', range]])
        ).variants.find((v) => v.canonical === 'bench-chains')
      ).toMatchObject({ status, fittedStatus });
    }
  );

  it('tracks isCompLift tag correctly', () => {
    const compReport = diagnose(
      [pt('bench', 100, day(20), ['comp-lift'])],
      model,
      map,
      opts,
      undefined
    );
    expect(compReport.variants[0]).toMatchObject({ canonical: 'bench', isCompLift: true });

    const variantReport = diagnose(
      [basePt, pt('bench-chains', 82, day(20))],
      model,
      map,
      opts,
      undefined
    );
    const variant = variantReport.variants.find((v) => v.canonical === 'bench-chains')!;
    expect(variant.isCompLift).toBe(false);

    const compVariantReport = diagnose(
      [pt('bench', 100, day(20), ['comp-lift']), pt('bench-chains', 82, day(20), ['comp-lift'])],
      model,
      map,
      opts,
      undefined
    );
    const compBase = compVariantReport.variants.find((v) => v.canonical === 'bench')!;
    const compVariant = compVariantReport.variants.find((v) => v.canonical === 'bench-chains')!;
    expect(compBase.isCompLift).toBe(true);
    expect(compVariant.isCompLift).toBe(true);
  });
});
