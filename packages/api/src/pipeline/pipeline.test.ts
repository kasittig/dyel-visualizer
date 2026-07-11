import { describe, it, expect } from 'vitest';
import type { AthleteContext } from '@dyel/pipeline';
import { buildPipelineModel } from './buildPipelineModel';
import { validatePipelineRun } from './validatePipelineRun';

const PLACEHOLDER_ATHLETE: AthleteContext = {
  sex: 'M',
  bodyweight: 90,
  deadliftStance: 'sumo',
};

const SAMPLE_CSV = `Date,Exercise,Reps,Weight (lbs),Sets,RPE
2026-01-01,Squat,5,225,3,
2026-01-01,Squat,3,275,1,9
2026-01-02,Bench,8,185,4,
2026-01-02,Bench Press,1,225,,8
2026-01-03,Deadlift,3,315,1,8
2026-01-03,Conventional Deadlift,5,275,2,
2026-01-04,Curls,8,50,3,
`;

describe('buildPipelineModel', () => {
  it.each([
    [
      'parses CSV and returns pipeline model with tagged records',
      [{ name: 'test.csv', content: SAMPLE_CSV }],
      PLACEHOLDER_ATHLETE,
    ],
  ])('%s', (_, rawInputs, athlete) => {
    const model = buildPipelineModel(rawInputs, athlete);

    expect(model).toHaveProperty('tagged');
    expect(Array.isArray(model.tagged)).toBe(true);
    expect(model.tagged.length).toBeGreaterThan(0);
    expect(model.tagged[0]).toHaveProperty('canonical');
    expect(model.tagged[0]).toHaveProperty('tags');
  });

  it('handles empty raw input gracefully', () => {
    const model = buildPipelineModel([], PLACEHOLDER_ATHLETE);

    expect(model).toHaveProperty('tagged');
    expect(model.tagged).toHaveLength(0);
  });

  it('respects athlete context in computation', () => {
    const athlete1: AthleteContext = { sex: 'M', bodyweight: 80, deadliftStance: 'conventional' };
    const athlete2: AthleteContext = { sex: 'F', bodyweight: 65, deadliftStance: 'sumo' };

    const model1 = buildPipelineModel([{ name: 'test.csv', content: SAMPLE_CSV }], athlete1);
    const model2 = buildPipelineModel([{ name: 'test.csv', content: SAMPLE_CSV }], athlete2);

    // Both should produce models with tagged records
    expect(model1.tagged.length).toBeGreaterThan(0);
    expect(model2.tagged.length).toBeGreaterThan(0);
  });
});

describe('validatePipelineRun', () => {
  it.each([
    [
      'returns pipeline result with validation diagnostics',
      [{ name: 'test.csv', content: SAMPLE_CSV }],
      PLACEHOLDER_ATHLETE,
    ],
  ])('%s', (_, rawInputs, athlete) => {
    const result = validatePipelineRun(rawInputs, athlete);

    expect(result).toHaveProperty('parseErrors');
    expect(result).toHaveProperty('unknownExercises');
    expect(Array.isArray(result.parseErrors)).toBe(true);
    expect(Array.isArray(result.unknownExercises)).toBe(true);
  });

  it('handles empty raw inputs', () => {
    const result = validatePipelineRun([], PLACEHOLDER_ATHLETE);

    expect(result).toHaveProperty('parseErrors');
    expect(result).toHaveProperty('unknownExercises');
  });
});
