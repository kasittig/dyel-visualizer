import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildPipelineModel, classifyAccessory, type PipelineModel } from '@dyel/api';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../data-source';

describe('accessory coverage fixture classification', () => {
  let model: PipelineModel;

  beforeAll(() => {
    model = buildPipelineModel(
      [
        buildRawInput(
          'url',
          readFileSync(join(__dirname, '../../../test/fixtures/total-chart-sheet.csv'), 'utf-8')
        ),
      ],
      PLACEHOLDER_ATHLETE
    );
  });

  it.each([
    ['Birddog', 'core'],
    ['Side Bend', 'core'],
    ['Stir the pot', 'core'],
    ['Pull Through', 'glutes'],
    ['Dumbbell Rollback', 'triceps'],
    ['French Press', 'triceps'],
    ['Tate Press', 'triceps'],
    ['Mini Band Pull Apart', 'shoulders'],
  ] as const)('%s fixture rows classify as %s', (exercise, category) => {
    const records = model.tagged.filter((record) => record.meta?.rawExercise === exercise);
    expect(records.length).toBeGreaterThan(0);
    expect(new Set(records.map((record) => classifyAccessory(record).category))).toEqual(
      new Set([category])
    );
  });
});
