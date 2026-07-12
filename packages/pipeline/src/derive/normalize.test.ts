import { describe, it, expect } from 'vitest';
import { fitNormalizationModel } from './normalize';
import type { TaggedSetRecord } from '../tag/tag';

const d = (n: number) => Date.UTC(2024, 0, n);
const ath = () => ({ sex: 'M' as const, bodyweight: 90, deadliftStance: 'conventional' as const });

const r = (
  dt: number,
  ex: string,
  wt: number,
  tags: string[],
  sets?: number,
  raw?: string
): TaggedSetRecord => ({
  date: dt,
  exercise: ex,
  weight: wt,
  reps: 1,
  canonical: ex,
  tags: new Set(tags),
  effects: [],
  baselineRange: null,
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
    const m = fitNormalizationModel(hist, { minSamples: 1 }, ath());
    expect(m.baseline['lift:bench']).toBe('bench');
    expect(m.baseline['lift:squat']).toBe('squat');
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);

    const noComp = [1, 3, 5]
      .map((n) => r(d(n), 'ohp-a', 50, ['lift:ohp']))
      .concat(r(d(1), 'ohp-b', 40, ['lift:ohp']));
    expect(fitNormalizationModel(noComp, { minSamples: 1 }, ath()).baseline['lift:ohp']).toBe(
      'ohp-a'
    );
    expect(
      fitNormalizationModel(hist, { minSamples: 3 }, ath()).variantFactor['bench-chains']
    ).toBeUndefined();

    const m2 = fitNormalizationModel(hist, { minSamples: 2 }, ath());
    expect(m2.variantFactor['bench-chains']).toEqual({ factor: expect.any(Number), n: 2 });
    expect(m2.addlWtOffset['bench-chains'].offsetKg).toBe(20);
  });

  it('evaluates speed-work and context queries', () => {
    const bh = hist.filter((x) => x.exercise.startsWith('bench')),
      v = r(d(5), 'bench-paused', 95, ['lift:bench', 'variation']);
    const wOut = fitNormalizationModel([...bh, v], { minSamples: 1 }, ath());
    const wIn = fitNormalizationModel(
      [...bh, v, r(d(5), 'bench', 10, ['lift:bench', 'comp-lift'], 9)],
      { minSamples: 1 },
      ath()
    );
    expect(wIn.variantFactor['bench-paused'].factor).not.toBeCloseTo(
      wOut.variantFactor['bench-paused'].factor,
      1
    );
  });

  it('enforces fallback & structural hierarchies', () => {
    const comp = [
      r(d(1), 'b', 100, ['lift:b'], 0, 'Bench'),
      r(d(1), 'v', 90, ['lift:b'], 0, 'Competition Bench'),
    ];
    expect(fitNormalizationModel(comp, { minSamples: 1 }, ath()).baseline['lift:b']).toBe('v');

    const p = [
      r(d(1), 'b', 100, ['lift:bench', 'comp-lift']),
      r(d(1), 'bp', 95, ['lift:bench', 'equip:pause']),
    ];
    expect(fitNormalizationModel(p, { minSamples: 1 }, ath()).baseline['lift:bench']).toBe('bp');

    const np = [
      r(d(1), 'b', 100, ['lift:bench', 'comp-lift']),
      r(d(1), 'bcp', 80, ['lift:bench', 'equip:pause', 'addl:chains']),
    ];
    expect(fitNormalizationModel(np, { minSamples: 1 }, ath()).baseline['lift:bench']).toBe('b');

    const s = [
      r(d(1), 's', 200, ['lift:squat', 'comp-lift']),
      r(d(1), 'sp', 180, ['lift:squat', 'equip:pause']),
    ];
    expect(fitNormalizationModel(s, { minSamples: 1 }, ath()).baseline['lift:squat']).toBe('s');

    const mix = [...p, r(d(1), 'bn', 110, ['lift:bench'], 0, 'Competition Bench')];
    expect(fitNormalizationModel(mix, { minSamples: 1 }, ath()).baseline['lift:bench']).toBe('bn');
  });
});
