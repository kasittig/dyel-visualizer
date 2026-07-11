import { describe, it, expect } from 'vitest';
import { classifyPipelineVerdict } from './validationVerdict';
import type { PipelineResult } from '@dyel/pipeline';

describe('classifyPipelineVerdict', () => {
  const baseResult = (overrides?: Partial<PipelineResult>): PipelineResult =>
    ({
      parseErrors: [],
      unknownExercises: [],
      unnormalized: [],
      ...overrides,
    }) as PipelineResult;

  it.each([
    ['error: parse errors only', { parseErrors: ['error 1'] }, 'error'],
    [
      'error: parse errors with warnings',
      { parseErrors: ['error 1'], unknownExercises: ['ex1'] },
      'error',
    ],
    ['warning: unknown exercises only', { unknownExercises: ['ex1'] }, 'warning'],
    ['warning: unnormalized only', { unnormalized: ['item1'] }, 'warning'],
    [
      'warning: both unknown and unnormalized',
      { unknownExercises: ['ex1'], unnormalized: ['item1'] },
      'warning',
    ],
    ['ok: all empty', {}, 'ok'],
  ])('returns %s', (_, overrides, expected) => {
    expect(classifyPipelineVerdict(baseResult(overrides))).toBe(expected);
  });
});
