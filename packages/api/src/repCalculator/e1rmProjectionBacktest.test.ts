import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { AthleteContext } from '@dyel/pipeline';
import { buildPipelineModel } from '../pipeline/buildPipelineModel';
import { runE1RMProjectionBacktest } from './e1rmProjectionBacktest';

describe('runE1RMProjectionBacktest', () => {
  let fixtureModel: ReturnType<typeof buildPipelineModel>;

  beforeAll(() => {
    const csv = readFileSync(
      join(__dirname, '../../test/fixtures/bench-family-e1rm-log.csv'),
      'utf-8'
    );
    const athlete: AthleteContext = { sex: 'M', bodyweight: 90 };
    fixtureModel = buildPipelineModel(
      [{ name: 'bench-family-e1rm-log.csv', content: csv }],
      athlete
    );
  });

  it('compares e1RM projection methods (baseline vs. family-recent)', () => {
    const groundTruthPoints = fixtureModel.pointsByDeriver.get('e1rm-max-effort') ?? [];
    const summary = runE1RMProjectionBacktest(fixtureModel.tagged, groundTruthPoints);

    expect(summary.events.length).toBeGreaterThan(10);
    expect(Number.isFinite(summary.maeBaseline)).toBe(true);
    expect(summary.maeBaseline).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(summary.maeFamilyRecent)).toBe(true);
    expect(summary.maeFamilyRecent).toBeGreaterThanOrEqual(0);

    // Print readable summary table
    console.table({
      'MAE (Baseline)': summary.maeBaseline.toFixed(2),
      'MAE (Family Recent)': summary.maeFamilyRecent.toFixed(2),
      'Wins (Baseline)': summary.winsBaseline,
      'Wins (Family Recent)': summary.winsFamilyRecent,
      Ties: summary.ties,
      'Total Events': summary.events.length,
    });
  });
});
