import { describe, it, expect } from 'vitest';
import { runPipelineModel } from './pipeline';
import type { PipelineModel } from './pipeline';

const ath = () => ({ sex: 'M' as const, bodyweight: 90 });

describe('pipeline orchestration', () => {
  it('retains valid freeform records around malformed lines', () => {
    const model = runPipelineModel(
      [
        {
          name: 'mixed.txt',
          content: '2026-01-10 Squat 315x5\ninvalid line\n2026-01-11 Bench 225x5',
        },
      ],
      ath()
    );
    expect(model.tagged.map((record) => record.exercise)).toEqual(['squat', 'bench']);
    expect(model.parseErrors).toHaveLength(1);
    expect(model.parseErrors[0].line).toBe(2);
  });

  it('fits normalization model on full tagged set including speed-work records', () => {
    const log = `units: kg\n2023-12-31 Bench 120 x3 @9\n2023-12-31 Dumbbell Bench 55 x3 @9\n2024-01-01 Bench 100 x5 @8\n2024-01-02 Bench 105 x5 @8\n2024-01-03 Bench 110 x5 @8\n2024-01-04 Bench 115 x5 @8\n2024-01-02 Dumbbell Bench 3x5 @ 45\n2024-01-07 Dumbbell Bench 3x5 @ 50`;
    const model = runPipelineModel([{ name: 'log.txt', content: log }], ath()) as PipelineModel;

    expect(model.model.baseline['lift:bench']).toBe('bench');
    expect(model.model.variantFactor['bench-dumbbell']).toBeDefined();
    expect(model.model.variantFactor['bench-dumbbell']?.factor).toBeGreaterThan(0);
  });

  it.each(['chains', 'bands'])(
    'compares %s bar-weight e1RM with an offset-adjusted bar-weight expectation',
    (modifier) => {
      const log = `2023-12-31 Bench 110kg x3 @9\n2023-12-31 Bench (${modifier}) 90kg x3 @9\n2024-01-01 Bench 100kg x5 @8\n2024-01-01 Bench (${modifier}) 80kg x5\n2024-01-05 Bench 105kg x5 @8\n2024-01-05 Bench (${modifier}) 85kg x5`;
      const model = runPipelineModel([{ name: 'log.txt', content: log }], ath()) as PipelineModel;

      const adjustedVariant = Object.keys(model.model.addlWtOffset).find((k) =>
        k.toLowerCase().includes(modifier)
      );
      if (!adjustedVariant) {
        throw new Error(`Expected ${modifier} variant with offset`);
      }
      expect(model.model.addlWtOffset[adjustedVariant].offsetKg).toBeGreaterThan(0);

      const unadj = model.points.get('e1rm').filter((p) => p.series === adjustedVariant);
      const adj = model.points
        .get('e1rm', { adjusted: true })
        .filter((p) => p.series === adjustedVariant);

      expect(unadj.length).toBeGreaterThan(0);
      expect(adj.length).toBeGreaterThan(0);
      expect(
        adj.some((a) => {
          const u = unadj.find((p) => p.t === a.t);
          return u && Math.abs(a.v - u.v) > 0.01 && a.v > u.v;
        })
      ).toBe(true);

      const latestUnadjusted = unadj.reduce((a, b) => (b.t > a.t ? b : a));
      const latestAdjusted = adj.reduce((a, b) => (b.t > a.t ? b : a));
      const diagnostic = model.diagnostics.variants.find((v) => v.canonical === adjustedVariant)!;
      const baselineLatest = model.points
        .get('e1rm')
        .filter((p) => p.series === model.model.baseline['lift:bench'])
        .reduce((a, b) => (b.t > a.t ? b : a));
      expect(diagnostic.actualE1rmKg).toBeCloseTo(latestUnadjusted.v);
      expect(diagnostic.actualE1rmKg).not.toBeCloseTo(latestAdjusted.v);
      expect(diagnostic.expectedE1rmKg).toBeCloseTo(
        model.model.variantFactor[adjustedVariant].factor * baselineLatest.v -
          model.model.addlWtOffset[adjustedVariant].offsetKg
      );
    }
  );

  it.each([
    ['single-set records (effort)', `2024-01-01 Bench 100kg x5 @8\n2024-01-05 Bench 105kg x5 @8`],
    [
      'speed-work with fallback',
      `2024-01-01 Bench 100kg x5 @8\n2024-01-05 Bench (speed) 3x5 @ 85kg\n2024-01-08 Bench (speed) 3x5 @ 90kg`,
    ],
  ])('generates valid models and points for %s', (_, log) => {
    const model = runPipelineModel([{ name: 'log.txt', content: log }], ath());
    ['baseline', 'variantFactor'].forEach((k) => expect(model.model[k]).toBeDefined());
    ['e1rm', 'tonnage', 'top-set'].forEach((d) => expect(model.points.has(d)).toBe(true));
  });

  it('classifyAccessorySubtypes is wired into pipeline and applied to tagged records', () => {
    const model = runPipelineModel(
      [
        {
          name: 'log.txt',
          content: `units: kg\n2024-01-01 Bench 100 x3 @9\n2024-01-02 Bench 105 x5 @8`,
        },
      ],
      ath()
    );
    const bench = model.tagged.filter((r) => r.tags.has('lift:bench'));

    expect(bench.length).toBe(2);
    bench.forEach((r) => {
      expect(r.tags.has('comp-lift')).toBe(true);
      expect([...r.tags].some((t) => t.startsWith('accessory:'))).toBe(false);
    });
  });

  it('includes canonical and label-grouped accessory points so app charts render', () => {
    const log = `units: kg\n2024-01-01 Squat 100 x3 @9\n2024-01-01 Bench 80 x3 @9\n2024-01-01 Bicep Curl 15 x10 @8`;
    const model = runPipelineModel([{ name: 'log.txt', content: log }], ath());
    const acc = model.tagged.filter((r) => r.tags.has('lift:accessory'));

    expect(acc.length).toBe(1);
    expect(model.points.get('e1rm').some((p) => p.series === acc[0].canonical)).toBe(true);
    expect(
      model.points.get('e1rm', { groupBy: 'label' }).some((p) => p.tags.has('lift:accessory'))
    ).toBe(true);
    expect(Object.values(model.model.baseline)).not.toContain(acc[0].canonical);
    expect(model.model.variantFactor[acc[0].canonical]).toBeUndefined();
    expect(model.diagnostics.unassessed.some((item) => item.canonical === acc[0].canonical)).toBe(
      false
    );
  });

  describe('automatic competition deadlift-stance derivation', () => {
    it.each([
      [
        'sumo strictly higher e1RM',
        `2024-01-01 Sumo Deadlift 150kg x3 @9\n2024-01-01 Deadlift 100kg x3 @9`,
        'sumo',
      ],
      [
        'conventional strictly higher e1RM',
        `2024-01-01 Sumo Deadlift 100kg x3 @9\n2024-01-01 Deadlift 150kg x3 @9`,
        'conventional',
      ],
      [
        'tied e1RM defaults to conventional',
        `2024-01-01 Sumo Deadlift 100kg x3 @9\n2024-01-01 Deadlift 100kg x3 @9`,
        'conventional',
      ],
      [
        'no sumo data at all defaults to conventional',
        `2024-01-01 Deadlift 100kg x3 @9`,
        'conventional',
      ],
    ])('tags "competition" on the %s deadlift stance only', (_, log, winner) => {
      const model = runPipelineModel([{ name: 'log.txt', content: log }], ath()) as PipelineModel;
      const sumo = model.tagged.filter((r) => r.canonical === 'deadlift-sumo');
      const conv = model.tagged.filter((r) => r.canonical === 'deadlift');

      if (sumo.length) {
        expect(sumo.every((r) => r.tags.has('competition'))).toBe(winner === 'sumo');
      }
      expect(conv.every((r) => r.tags.has('competition'))).toBe(winner === 'conventional');
    });

    it('projects each stance forward to `now` rather than comparing raw all-time-best e1RM, so a stale PR does not outrank a currently-improving stance', () => {
      const log = [
        '2024-01-01 Sumo Deadlift 150kg x3 @9',
        '2024-01-01 Deadlift 100kg x3 @9',
        '2024-01-08 Deadlift 130kg x3 @9',
      ].join('\n');
      const now = new Date('2024-02-01').getTime();
      const model = runPipelineModel(
        [{ name: 'log.txt', content: log }],
        ath(),
        now
      ) as PipelineModel;

      const sumo = model.tagged.filter((r) => r.canonical === 'deadlift-sumo');
      const conv = model.tagged.filter((r) => r.canonical === 'deadlift');

      // Raw all-time-best e1RM would favor sumo (175kg e1RM from a single 150kg set) over
      // conventional's best (151.67kg e1RM from 130kg). But conventional's upward trend
      // (116.67kg -> 151.67kg over 7 days), extrapolated forward to `now`, surpasses sumo's
      // flat single-point projection — so conventional should win the "competition" tag.
      expect(sumo.every((r) => r.tags.has('competition'))).toBe(false);
      expect(conv.every((r) => r.tags.has('competition'))).toBe(true);
    });

    it('always tags bare Squat and Bench as "competition", independent of deadlift data', () => {
      const logs = [
        `2024-01-01 Squat 100kg x3 @9\n2024-01-01 Bench 80kg x3 @9\n2024-01-01 Sumo Deadlift 150kg x3 @9\n2024-01-01 Deadlift 100kg x3 @9`,
        `2024-01-01 Squat 100kg x3 @9\n2024-01-01 Bench 80kg x3 @9`,
      ];

      logs.forEach((log) => {
        const model = runPipelineModel([{ name: 'log.txt', content: log }], ath()) as PipelineModel;
        ['squat', 'bench'].forEach((c) => {
          const recs = model.tagged.filter((r) => r.canonical === c);
          expect(recs.length).toBeGreaterThan(0);
          expect(recs.every((r) => r.tags.has('competition'))).toBe(true);
        });
      });
    });
  });
});
