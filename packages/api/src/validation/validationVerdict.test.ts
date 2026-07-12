import { describe, it, expect } from 'vitest';
import { classifyPipelineVerdict } from './validationVerdict';
import { ParseError } from '@dyel/pipeline';
import type { PipelineResult } from '@dyel/pipeline';

describe('classifyPipelineVerdict', () => {
  const mockResult = (overrides?: Partial<PipelineResult>) =>
    ({
      parseErrors: [],
      unknownExercises: [],
      unnormalized: [],
      ...overrides,
    }) as PipelineResult;

  it.each([
    ['error: parse errors only', { parseErrors: [new ParseError('err')] }, 'error'],
    [
      'error: mixed warnings',
      { parseErrors: [new ParseError('err')], unknownExercises: ['ex'] },
      'error',
    ],
    ['warning: unknown exercises', { unknownExercises: ['ex'] }, 'warning'],
    ['warning: unnormalized', { unnormalized: ['item'] }, 'warning'],
    ['warning: multiple alerts', { unknownExercises: ['ex'], unnormalized: ['item'] }, 'warning'],
    ['ok: completely clean', {}, 'ok'],
  ])('returns %s', (_, overrides, expected) => {
    expect(classifyPipelineVerdict(mockResult(overrides))).toBe(expected);
  });
});
