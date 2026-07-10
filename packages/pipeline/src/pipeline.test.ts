import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runPipeline, runPipelineModel, buildDatasetsFromModel } from './pipeline';
import type { DatasetSpec } from './dataset/build';

const loadFixture = (name: string) => ({
  name,
  content: fs.readFileSync(path.join(__dirname, '../test/fixtures', name), 'utf-8'),
});

const FIXTURE_NAMES: string[] = [
  'csv-header-unit-lbs.csv',
  'csv-unit-column-mixed.csv',
  'csv-cell-suffix-unit.csv',
  'freeform-simple-form.txt',
  'freeform-reversed-form.txt',
  'freeform-inline-unit-suffix.txt',
  'freeform-preamble-units-kg.txt',
  'freeform-multi-weight-shorthand.txt',
  'freeform-near-variant-exercise-names.txt',
  'freeform-malformed-line.txt',
];

const comps = [
  { label: 'squat', include: { any: ['lift:squat'] } },
  { label: 'bench', include: { any: ['lift:bench'] } },
  { label: 'deadlift', include: { any: ['lift:deadlift'] } },
];
const specs: DatasetSpec[] = [
  {
    id: 'e1rm-per-bench-variant',
    kind: 'series',
    include: { any: ['lift:bench'] },
    derive: 'e1rm',
  },
  { id: 'tonnage-per-lift', kind: 'series', include: {}, derive: 'tonnage' },
  {
    id: 'estimated-total',
    kind: 'composite',
    derive: 'e1rm',
    normalize: true,
    combine: 'sum',
    components: comps,
  },
  {
    id: 'wilks-total',
    kind: 'composite',
    derive: 'e1rm',
    normalize: true,
    combine: 'sum',
    post: 'wilks',
    components: comps,
  },
];

const athlete = { sex: 'M' as const, bodyweight: 90, deadliftStance: 'conventional' as const };

describe('runPipeline (end-to-end)', () => {
  const raw = FIXTURE_NAMES.map(loadFixture),
    result = runPipeline(raw, specs, athlete, {});

  it('runs successfully with valid output structure', () => {
    specs.forEach((s) => {
      expect(result.datasets[s.id]).toBeInstanceOf(Array);
      result.datasets[s.id].forEach((row: Record<string, unknown>) => {
        expect(row.t).toBeTypeOf('number');
      });
    });
    expect(result).toMatchObject({
      parseErrors: [{ name: 'ParseError' }],
      diagnostics: {
        variants: expect.any(Array),
        weaknesses: expect.any(Array),
        unassessed: expect.any(Array),
      },
      unknownExercises: expect.any(Array),
      unnormalized: expect.any(Array),
    });
  });

  it('surfaces unmapped raw exercises', () => {
    expect(
      runPipeline(
        [...raw, { name: 'unmapped.txt', content: '2026-01-15 Curls 50x10 @8\n' }],
        specs,
        athlete,
        {}
      ).unknownExercises
    ).toContain('Curls');
  });

  it('re-runs integration from scratch without memoization', () => {
    const again = runPipeline(raw, specs, athlete, {});
    expect(again.datasets).toEqual(result.datasets);
    expect(again).not.toBe(result);
  });

  describe('e1rm-max-effort deriver spec variant', () => {
    it('excludes speed-work-only days that e1rm would still include', () => {
      const s: DatasetSpec[] = [
        {
          id: 'me-bench',
          kind: 'series',
          include: { any: ['lift:bench'] },
          derive: 'e1rm-max-effort',
        },
        { id: 'e1rm-bench', kind: 'series', include: { any: ['lift:bench'] }, derive: 'e1rm' },
      ];
      const res = runPipeline(
        [
          {
            name: 'sw.csv',
            content: 'Date,Exercise,Reps,Weight (lbs),Sets\n2026-01-10,Bench,3,85,9\n',
          },
        ],
        s,
        athlete,
        {}
      );
      expect(res.datasets['e1rm-bench'].length).toBeGreaterThan(0);
      expect(res.datasets['me-bench']).toEqual([]);
    });

    it('respects a composite spec derive field', () => {
      const csv = [
        'Date,Exercise,Reps,Weight (lbs),Sets',
        '2026-01-10,Squat,3,200,9',
        '2026-01-10,Bench,3,85,9',
        '2026-01-10,Deadlift,3,250,9',
        '2026-01-15,Squat,5,200,',
        '2026-01-15,Bench,5,150,',
        '2026-01-15,Deadlift,5,250,',
      ].join('\n');
      const s: DatasetSpec[] = [
        {
          id: 'total-me',
          kind: 'composite',
          derive: 'e1rm-max-effort',
          normalize: true,
          combine: 'sum',
          components: comps,
        },
      ];
      const rows = runPipeline([{ name: 'comp.csv', content: csv }], s, athlete, {}).datasets[
        'total-me'
      ];
      expect(rows.length).toBeGreaterThan(0);
      expect(
        rows.every((r: Record<string, unknown>) => {
          return Number(r.t) !== new Date('2026-01-10').getTime();
        })
      ).toBe(true);
    });
  });

  describe('groupBy: label spec variant', () => {
    it('produces one series per distinct raw logged string', () => {
      const txt =
        '2026-01-10 Bench (CG) 185x5\n2026-01-10 Bench (close grip) 180x6\n2026-01-15 Bench (CG) 190x4\n2026-01-15 Bench (close grip) 185x5\n';
      const s: DatasetSpec[] = [
        {
          id: 'by-label',
          kind: 'series',
          include: { any: ['lift:bench'] },
          derive: 'e1rm',
          groupBy: 'label',
        },
        { id: 'by-canon', kind: 'series', include: { any: ['lift:bench'] }, derive: 'e1rm' },
      ];
      const res = runPipeline([{ name: 'var.txt', content: txt }], s, athlete, {});
      const lblKeys = Object.keys(res.datasets['by-label'][0] || {}).filter((k) => {
        return k !== 't';
      });
      const canKeys = Object.keys(res.datasets['by-canon'][0] || {}).filter((k) => {
        return k !== 't';
      });

      expect(res.datasets['by-label'].length).toBeGreaterThan(0);
      expect(res.datasets['by-canon'].length).toBeGreaterThan(0);
      expect(
        lblKeys.some((k) => {
          return k.includes('(');
        })
      ).toBe(true);
      expect(canKeys.length).toBeLessThan(lblKeys.length);
    });
  });

  describe('Design C: composite spec with addlWt (chains) and reps > 1', () => {
    it('uses weight-space-corrected e1RM values from offsetAdjustRecords', () => {
      const csv = [
        'Date,Exercise,Reps,Weight (lbs),RPE',
        '2026-01-10,Squat,5,405,',
        '2026-01-10,Bench,5,315,',
        '2026-01-10,Bench (chains),3,245,',
        '2026-01-10,Deadlift,5,495,',
        '2026-01-15,Squat,3,440,',
        '2026-01-15,Bench,3,335,',
        '2026-01-15,Bench (chains),2,270,',
        '2026-01-15,Deadlift,3,540,',
      ].join('\n');
      const s: DatasetSpec[] = [
        {
          id: 'est-total',
          kind: 'composite',
          derive: 'e1rm',
          normalize: true,
          combine: 'sum',
          components: comps,
        },
      ];

      const res = runPipeline([{ name: 'test.csv', content: csv }], s, athlete, {});
      const rows = res.datasets['est-total'];

      expect(rows.length).toBeGreaterThan(0);
      expect(res.model.addlWtOffset['bench-chains']).toMatchObject({
        offsetKg: expect.any(Number),
      });
      expect(res.model.addlWtOffset['bench-chains'].offsetKg).toBeGreaterThan(0);
      rows.forEach((r: Record<string, unknown>) => {
        expect(Number(r['est-total'])).toBeGreaterThan(0);
      });
    });
  });

  describe('pointsByLabelByDeriverAdjusted (by-label offset-adjusted points)', () => {
    it('produces offset-adjusted e1RM for addlWt labels, identical for non-addlWt', () => {
      const csv = [
        'Date,Exercise,Reps,Weight (lbs),RPE',
        '2026-01-10,Bench,5,315,',
        '2026-01-10,Bench (chains),3,245,',
        '2026-01-15,Bench,3,335,',
        '2026-01-15,Bench (chains),2,270,',
      ].join('\n');
      const model = runPipelineModel([{ name: 'test.csv', content: csv }], athlete);

      expect(model.model.addlWtOffset['bench-chains']).toMatchObject({
        offsetKg: expect.any(Number),
      });

      const e1rmDeriver = 'e1rm';
      const rawByLabel = model.pointsByLabelByDeriver.get(e1rmDeriver)!;
      const adjustedByLabel = model.pointsByLabelByDeriverAdjusted.get(e1rmDeriver)!;

      // Both should have same timestamps and series (labels)
      expect(rawByLabel.length).toBe(adjustedByLabel.length);

      // Find points for "Bench" and "Bench (chains)"
      const rawBench = rawByLabel.filter((p) => p.series === 'Bench');
      const adjustedBench = adjustedByLabel.filter((p) => p.series === 'Bench');
      const rawChains = rawByLabel.filter((p) => p.series === 'Bench (chains)');
      const adjustedChains = adjustedByLabel.filter((p) => p.series === 'Bench (chains)');

      // Non-addlWt "Bench" should be identical
      expect(rawBench.length).toBeGreaterThan(0);
      expect(adjustedBench.length).toBe(rawBench.length);
      rawBench.forEach((rawPoint, i) => {
        expect(adjustedBench[i].v).toBe(rawPoint.v);
      });

      // AddlWt "Bench (chains)" should differ (adjusted should be higher due to offset)
      expect(rawChains.length).toBeGreaterThan(0);
      expect(adjustedChains.length).toBe(rawChains.length);
      rawChains.forEach((rawPoint, i) => {
        expect(adjustedChains[i].v).toBeGreaterThan(rawPoint.v);
      });
    });

    it('sources normalized by-label series from pointsByLabelByDeriverAdjusted via buildDatasetsFromModel', () => {
      const csv = [
        'Date,Exercise,Reps,Weight (lbs),RPE',
        '2026-01-10,Bench,5,315,',
        '2026-01-10,Bench (chains),3,245,',
        '2026-01-15,Bench,3,335,',
        '2026-01-15,Bench (chains),2,270,',
      ].join('\n');
      const model = runPipelineModel([{ name: 'test.csv', content: csv }], athlete);

      // Spec without normalize: true (raw)
      const rawSpec: DatasetSpec[] = [
        {
          id: 'by-label-raw',
          kind: 'series',
          include: { any: ['lift:bench'] },
          derive: 'e1rm',
          groupBy: 'label',
        },
      ];

      // Spec with normalize: true (adjusted)
      const normalizedSpec: DatasetSpec[] = [
        {
          id: 'by-label-normalized',
          kind: 'series',
          include: { any: ['lift:bench'] },
          derive: 'e1rm',
          groupBy: 'label',
          normalize: true,
        },
      ];

      const rawDatasets = buildDatasetsFromModel(model, rawSpec, {});
      const normalizedDatasets = buildDatasetsFromModel(model, normalizedSpec, {});

      // Both should produce rows
      expect(rawDatasets['by-label-raw'].length).toBeGreaterThan(0);
      expect(normalizedDatasets['by-label-normalized'].length).toBeGreaterThan(0);

      // Both should have same length (same timestamps)
      expect(rawDatasets['by-label-raw'].length).toBe(
        normalizedDatasets['by-label-normalized'].length
      );

      // Find a timestamp that has both "Bench" and "Bench (chains)"
      const rawRows = rawDatasets['by-label-raw'];
      const normalizedRows = normalizedDatasets['by-label-normalized'];

      rawRows.forEach((rawRow, i) => {
        const normalizedRow = normalizedRows[i];

        // "Bench" should be identical
        if (rawRow['Bench'] !== undefined) {
          expect(normalizedRow['Bench']).toBe(rawRow['Bench']);
        }

        // "Bench (chains)" should differ (normalized should be higher)
        if (rawRow['Bench (chains)'] !== undefined) {
          expect(normalizedRow['Bench (chains)']).toBeGreaterThan(rawRow['Bench (chains)']);
        }
      });
    });
  });

  describe('parity: runPipeline vs runPipelineModel + buildDatasetsFromModel', () => {
    it('produces identical output through both paths', () => {
      const raw = FIXTURE_NAMES.map(loadFixture);
      const testSpecs: DatasetSpec[] = [
        {
          id: 'e1rm-per-bench-variant',
          kind: 'series',
          include: { any: ['lift:bench'] },
          derive: 'e1rm',
        },
        { id: 'tonnage-per-lift', kind: 'series', include: {}, derive: 'tonnage' },
        {
          id: 'estimated-total',
          kind: 'composite',
          derive: 'e1rm',
          normalize: true,
          combine: 'sum',
          components: comps,
        },
      ];
      const testAthlete = {
        sex: 'M' as const,
        bodyweight: 90,
        deadliftStance: 'conventional' as const,
      };
      const ui = {};
      const now = Date.now();

      // Old path: runPipeline (uses the same now value)
      const oldResult = runPipeline(raw, testSpecs, testAthlete, ui, now);

      // New path: runPipelineModel + buildDatasetsFromModel (uses the same now value)
      const model = runPipelineModel(raw, testAthlete, now);
      const datasets = buildDatasetsFromModel(model, testSpecs, ui);
      const newResult = {
        datasets,
        diagnostics: model.diagnostics,
        unknownExercises: model.unknownExercises,
        unnormalized: model.unnormalized,
        parseErrors: model.parseErrors,
        model: model.model,
      };

      // Verify identical output (ignoring fittedAt timestamp which differs on each run)
      expect(newResult.datasets).toEqual(oldResult.datasets);
      expect(newResult.diagnostics).toEqual(oldResult.diagnostics);
      expect(newResult.unknownExercises).toEqual(oldResult.unknownExercises);
      expect(newResult.unnormalized).toEqual(oldResult.unnormalized);
      expect(newResult.parseErrors).toEqual(oldResult.parseErrors);
      expect(newResult.model).toMatchObject({
        baseline: oldResult.model.baseline,
        variantFactor: oldResult.model.variantFactor,
        addlWtOffset: oldResult.model.addlWtOffset,
      });
    });
  });
});
