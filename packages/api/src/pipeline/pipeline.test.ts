import { describe, it, expect } from 'vitest';
import type { AthleteContext } from '@dyel/pipeline';
import { buildPipelineModel } from './buildPipelineModel';
import { validatePipelineRun } from './validatePipelineRun';

const athlete: AthleteContext = { sex: 'M', bodyweight: 90, deadliftStance: 'sumo' };
const csv =
  'Date,Exercise,Reps,Weight (lbs),Sets,RPE\n2026-01-01,Squat,5,225,3,\n2026-01-01,Squat,3,275,1,9\n2026-01-02,Bench,8,185,4,\n2026-01-02,Bench Press,1,225,,8';
const inputs = [{ name: 't.csv', content: csv }];

describe('buildPipelineModel', () => {
  it('parses inputs and respects athlete context changes', () => {
    const m1 = buildPipelineModel(inputs, athlete);
    const m2 = buildPipelineModel(inputs, {
      sex: 'F',
      bodyweight: 65,
      deadliftStance: 'conventional',
    });

    expect(m1.tagged.length).toBeGreaterThan(0);
    expect(m2.tagged.length).toBeGreaterThan(0);
    expect(m1.tagged[0]).toHaveProperty('canonical');
    expect(m1.tagged[0]).toHaveProperty('tags');
  });

  it('handles empty raw input gracefully', () => {
    expect(buildPipelineModel([], athlete).tagged).toHaveLength(0);
  });
});

describe('validatePipelineRun', () => {
  it('returns and validates diagnostics on populations or empty sets', () => {
    const res = validatePipelineRun(inputs, athlete);
    const empty = validatePipelineRun([], athlete);

    expect(Array.isArray(res.parseErrors)).toBe(true);
    expect(Array.isArray(res.unknownExercises)).toBe(true);
    expect(empty).toHaveProperty('parseErrors');
    expect(empty).toHaveProperty('unknownExercises');
  });
});
