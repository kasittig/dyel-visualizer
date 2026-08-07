import { describe, expect, it } from 'vitest';
import {
  createPipelinePointStore,
  tagRecordsByPrimaryEvidence,
  type PipelineModel,
  type SetRecord,
} from '@dyel/pipeline';
import { deriveHistoricalWeaknessTrends } from './weaknessTrends';

const DAY = 86_400_000;
const record = (date: number, exercise: string, weight: number, reps = 1): SetRecord => ({
  date,
  exercise,
  weight,
  reps,
});
const model = (records: SetRecord[]): PipelineModel => ({
  model: { baseline: {}, variantFactor: {}, addlWtOffset: {}, fittedAt: 0 },
  diagnostics: { variants: [], weaknesses: [], unassessed: [] },
  unknownExercises: [],
  unnormalized: [],
  parseErrors: [],
  points: createPipelinePointStore(),
  tagged: tagRecordsByPrimaryEvidence(records).tagged,
  athlete: { sex: 'M', bodyweight: 90 },
});
const qualityPoints = (weights: number[]) =>
  deriveHistoricalWeaknessTrends(
    model(
      weights.flatMap((weight, index) => [
        record(index * DAY, 'Bench', 100),
        record(index * DAY, 'Bench (2 board)', weight),
      ])
    )
  ).filter(({ quality }) => quality === 'TRICEP_DOMINANT');

describe('deriveHistoricalWeaknessTrends', () => {
  it.each([
    ['improving', [80, 100], 'improving'],
    ['unchanged', [90, 90], 'unchanged'],
    ['worsening', [100, 80], 'worsening'],
  ] as const)('classifies %s consecutive normalized results', (_, weights, expected) => {
    const points = qualityPoints([...weights]);

    expect(points.map(({ status }) => status)).toEqual(['insufficient-history', expected]);
    expect(points[1].contributingVariations).toEqual([
      expect.objectContaining({
        canonical: 'bench-board-2',
        latestAt: DAY,
      }),
    ]);
    expect(points[1].evidenceCount).toBe(1);
  });

  it('is cutoff-safe, ordered, and keeps current diagnostics unchanged', () => {
    const historical = model([
      record(0, 'Bench', 100),
      record(0, 'Bench (2 board)', 80),
      record(DAY, 'Bench', 100),
      record(DAY, 'Bench (2 board)', 90),
    ]);
    historical.diagnostics.weaknesses.push({
      quality: 'existing',
      score: 1,
      evidence: ['unchanged'],
    });
    const before = structuredClone(historical.diagnostics);
    const original = deriveHistoricalWeaknessTrends(historical);
    const withFuture = deriveHistoricalWeaknessTrends(
      model([
        ...historical.tagged.map((item) => ({
          date: item.date,
          exercise: item.meta?.rawExercise ?? item.exercise,
          weight: item.weight,
          reps: item.reps,
        })),
        record(2 * DAY, 'Bench', 200),
        record(2 * DAY, 'Bench (2 board)', 40),
      ])
    );

    expect(withFuture.filter(({ date }) => date <= DAY)).toEqual(original);
    expect(original.map(({ date }) => date)).toEqual([...original.map(({ date }) => date)].sort());
    expect(historical.diagnostics).toEqual(before);
  });

  it('uses stable quality identities and deterministic date-then-quality ordering', () => {
    const points = deriveHistoricalWeaknessTrends(
      model([record(0, 'Bench', 100), record(0, 'Bench (2 board)', 90)])
    );

    expect(points.map(({ quality }) => quality)).toEqual([
      'REDUCED_ROM',
      'SUPRAMAXIMAL',
      'TRICEP_DOMINANT',
      'UPPER_PECS',
    ]);
    expect(points.every(({ status }) => status === 'insufficient-history')).toBe(true);
  });

  it('retains stale contributors explicitly while excluding them from the normalized result', () => {
    const points = deriveHistoricalWeaknessTrends(
      model([
        record(0, 'Bench', 100),
        record(0, 'Bench (2 board)', 90),
        record(91 * DAY, 'Squat', 100),
        record(91 * DAY, 'Sumo Squat', 90),
      ])
    );
    const stale = points.find(
      ({ date, quality }) => date === 91 * DAY && quality === 'TRICEP_DOMINANT'
    );

    expect(stale).toMatchObject({
      normalizedResult: null,
      status: 'insufficient-history',
      evidenceCount: 0,
      staleEvidenceCount: 1,
      unassessedCount: 0,
      contributingVariations: [
        { canonical: 'bench-board-2', status: 'stale', latestAt: 0, ratio: 1 },
      ],
    });
  });

  it('does not let a future qualifying set promote an earlier sparse record', () => {
    const points = deriveHistoricalWeaknessTrends(
      model([
        record(0, 'Bench', 100),
        record(0, 'Bench (2 board)', 70, 8),
        record(DAY, 'Bench (2 board)', 90),
      ])
    );

    expect(points.some(({ date, quality }) => date === 0 && quality === 'TRICEP_DOMINANT')).toBe(
      false
    );
  });
});
