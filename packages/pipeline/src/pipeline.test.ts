import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runPipeline } from './pipeline';
import type { DatasetSpec } from './dataset/build';

const loadFixture = (name: string) => ({
  name,
  content: fs.readFileSync(path.join(__dirname, '../test/fixtures', name), 'utf-8'),
});

const FIXTURE_NAMES = [
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
    components: [
      { label: 'squat', include: { any: ['lift:squat'] } },
      { label: 'bench', include: { any: ['lift:bench'] } },
      { label: 'deadlift', include: { any: ['lift:deadlift'] } },
    ],
  },
  {
    id: 'wilks-total',
    kind: 'composite',
    derive: 'e1rm',
    normalize: true,
    combine: 'sum',
    post: 'wilks',
    components: [
      { label: 'squat', include: { any: ['lift:squat'] } },
      { label: 'bench', include: { any: ['lift:bench'] } },
      { label: 'deadlift', include: { any: ['lift:deadlift'] } },
    ],
  },
];

const athlete = { sex: 'M' as const, bodyweight: 90 };

describe('runPipeline (end-to-end)', () => {
  const raw = FIXTURE_NAMES.map(loadFixture);
  const result = runPipeline(raw, specs, athlete, {});

  it('runs successfully with a properly shaped output structure', () => {
    // Verifies all specs generated datasets containing valid time rows
    specs.forEach((s) => {
      expect(result.datasets[s.id]).toBeInstanceOf(Array);
      result.datasets[s.id].forEach((row) => expect(row.t).toBeTypeOf('number'));
    });

    // Holistic structural shape affirmation using toMatchObject
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
    const fresh = runPipeline(
      [...raw, { name: 'unmapped.txt', content: '2026-01-15 Curls 50x10 @8\n' }],
      specs,
      athlete,
      {}
    );
    expect(fresh.unknownExercises).toContain('Curls');
  });

  it('re-runs the integration code from scratch without memoization', () => {
    const again = runPipeline(raw, specs, athlete, {});
    expect(again.datasets).toEqual(result.datasets);
    expect(again).not.toBe(result);
  });
});
