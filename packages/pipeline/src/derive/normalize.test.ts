import { describe, it, expect } from 'vitest';
import { fitNormalizationModel } from './normalize';
import type { TaggedSetRecord } from '../tag/tag';

const d = (n: number) => Date.UTC(2024, 0, n);

const r = (
  dt: number,
  ex: string,
  wt: number,
  tags: string[],
  sets?: number,
  raw?: string,
  rpe?: number
): TaggedSetRecord => ({
  date: dt,
  exercise: ex,
  weight: wt,
  reps: 1,
  canonical: ex,
  tags: new Set(tags),
  effects: [],
  baselineRange: null,
  ...(rpe !== undefined ? { rpe } : {}),
  ...(sets || raw
    ? { meta: { ...(sets && { sets: String(sets) }), ...(raw && { rawExercise: raw }) } }
    : {}),
});

const hist = [
  ...[1, 10].flatMap((n) => [
    r(d(n), 'bench', 95 + n, ['lift:bench', 'comp-lift']),
    r(d(n), 'bench-chains', 75 + n, ['lift:bench', 'addl:chains', 'variation']),
  ]),
  ...[1, 10].flatMap((n) => [
    r(d(n), 'squat', 190 + n, ['lift:squat', 'comp-lift']),
    r(d(n), 'squat-chains', 140 + n, ['lift:squat', 'addl:chains', 'variation']),
  ]),
];

describe('fitNormalizationModel core & preferences', () => {
  it('handles core modeling constraints', () => {
    const m = fitNormalizationModel(hist, { minSamples: 1 });
    expect(m.baseline['lift:bench']).toBe('bench');
    expect(m.baseline['lift:squat']).toBe('squat');
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);

    const noComp = [1, 3, 5]
      .map((n) => r(d(n), 'ohp-a', 50, ['lift:ohp']))
      .concat(r(d(1), 'ohp-b', 40, ['lift:ohp']));
    expect(fitNormalizationModel(noComp, { minSamples: 1 }).baseline['lift:ohp']).toBe('ohp-a');
    expect(
      fitNormalizationModel(hist, { minSamples: 3 }).variantFactor['bench-chains']
    ).toBeUndefined();

    const m2 = fitNormalizationModel(hist, { minSamples: 2 });
    expect(m2.variantFactor['bench-chains']).toEqual({ factor: expect.any(Number), n: 2 });
    expect(m2.addlWtOffset['bench-chains'].offsetKg).toBe(20);
  });

  it('evaluates speed-work and context queries', () => {
    const bh = hist.filter((x) => x.exercise.startsWith('bench')),
      v = r(d(5), 'bench-paused', 95, ['lift:bench', 'variation']);
    const wOut = fitNormalizationModel([...bh, v], { minSamples: 1 });
    // Adding a speed-work bench set should NOT change the factor, because it's filtered out
    // at the per-canonical level before grid building
    const wIn = fitNormalizationModel(
      [...bh, v, r(d(5), 'bench', 10, ['lift:bench', 'comp-lift'], 9)],
      { minSamples: 1 }
    );
    expect(wIn.variantFactor['bench-paused'].factor).toBeCloseTo(
      wOut.variantFactor['bench-paused'].factor,
      1
    );
    // But adding an EFFORT set (with RPE) should change the factor, even at 9 sets
    const wRpe = fitNormalizationModel(
      [...bh, v, r(d(5), 'bench', 115, ['lift:bench', 'comp-lift'], 9, undefined, 7)],
      { minSamples: 1 }
    );
    expect(wRpe.variantFactor['bench-paused'].factor).not.toBeCloseTo(
      wOut.variantFactor['bench-paused'].factor,
      1
    );
  });

  it('enforces fallback & structural hierarchies', () => {
    const comp = [
      r(d(1), 'b', 100, ['lift:b'], 0, 'Bench'),
      r(d(1), 'v', 90, ['lift:b'], 0, 'Competition Bench'),
    ];
    expect(fitNormalizationModel(comp, { minSamples: 1 }).baseline['lift:b']).toBe('v');

    const p = [
      r(d(1), 'b', 100, ['lift:bench', 'comp-lift']),
      r(d(1), 'bp', 95, ['lift:bench', 'equip:pause']),
    ];
    expect(fitNormalizationModel(p, { minSamples: 1 }).baseline['lift:bench']).toBe('bp');

    const np = [
      r(d(1), 'b', 100, ['lift:bench', 'comp-lift']),
      r(d(1), 'bcp', 80, ['lift:bench', 'equip:pause', 'addl:chains']),
    ];
    expect(fitNormalizationModel(np, { minSamples: 1 }).baseline['lift:bench']).toBe('b');

    const s = [
      r(d(1), 's', 200, ['lift:squat', 'comp-lift']),
      r(d(1), 'sp', 180, ['lift:squat', 'equip:pause']),
    ];
    expect(fitNormalizationModel(s, { minSamples: 1 }).baseline['lift:squat']).toBe('s');

    const mix = [...p, r(d(1), 'bn', 110, ['lift:bench'], 0, 'Competition Bench')];
    expect(fitNormalizationModel(mix, { minSamples: 1 }).baseline['lift:bench']).toBe('bn');
  });

  it('handles speed-work-only canonicals with per-canonical fallback', () => {
    // Speed Bench variant logged exclusively as speed work (3x3, no RPE)
    const speedOnly = [
      r(d(1), 'bench-speed', 95, ['lift:bench', 'variation'], 3),
      r(d(5), 'bench-speed', 105, ['lift:bench', 'variation'], 3),
      r(d(10), 'bench-speed', 110, ['lift:bench', 'variation'], 3),
    ];
    // Regular bench for comparison
    const regular = [
      r(d(1), 'bench', 100, ['lift:bench', 'comp-lift']),
      r(d(5), 'bench', 110, ['lift:bench', 'comp-lift']),
      r(d(10), 'bench', 115, ['lift:bench', 'comp-lift']),
    ];

    const m = fitNormalizationModel([...regular, ...speedOnly], { minSamples: 1 });
    // Baseline should be regular bench (more records)
    expect(m.baseline['lift:bench']).toBe('bench');
    // Speed bench should get a variantFactor even though it's 100% speed work,
    // because of per-canonical fallback (it will use all its records for fitting)
    expect(m.variantFactor['bench-speed']).toBeDefined();
    expect(m.variantFactor['bench-speed']?.factor).toBeGreaterThan(0);
  });

  it('uses effort-filtered records when canonical has mixed effort and speed work', () => {
    // Bench variant with both effort and speed-work sets
    const mixed = [
      r(d(1), 'bench-pause', 90, ['lift:bench', 'variation']), // single set (effort)
      r(d(5), 'bench-pause', 85, ['lift:bench', 'variation'], 5), // speed work (5x sets, no RPE)
      r(d(10), 'bench-pause', 100, ['lift:bench', 'variation']), // single set (effort)
    ];
    // Regular bench for comparison
    const regular = [
      r(d(1), 'bench', 100, ['lift:bench', 'comp-lift']),
      r(d(5), 'bench', 110, ['lift:bench', 'comp-lift']),
      r(d(10), 'bench', 115, ['lift:bench', 'comp-lift']),
    ];

    const m = fitNormalizationModel([...regular, ...mixed], { minSamples: 1 });
    // Both should have factors
    expect(m.variantFactor['bench-pause']).toBeDefined();
    // The factor should be based on effort records only (90 and 100), not the 85 speed work
    const factor = m.variantFactor['bench-pause']?.factor || 1;
    const expectedFactor = (90 / 100 + 100 / 115) / 2; // avg of only effort records
    expect(factor).toBeCloseTo(expectedFactor, 1);
  });
});
