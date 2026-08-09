import { describe, expect, it } from 'vitest';
import {
  getExerciseRecommendations,
  getSupportedExerciseIssues,
  listSearchableExerciseNames,
  resolveAlternativeExercise,
} from './exerciseAlternatives';

describe('exercise alternatives selectors', () => {
  it.each([
    ['canonical name', 'Push-Up', 'push-up'],
    ['case-insensitive alias', 'PRESS-UP', 'push-up'],
    ['trimmed alias', '  football bar bench ', 'swiss-bar-bench-press'],
  ])('resolves a %s', (_, name, id) => expect(resolveAlternativeExercise(name)?.id).toBe(id));

  it('returns documented empty results for unknown input', () => {
    expect(resolveAlternativeExercise('unknown')).toBeNull();
    expect(getSupportedExerciseIssues('unknown')).toEqual([]);
    expect(getExerciseRecommendations('unknown', 'equipment-unavailable')).toEqual([]);
  });

  it('lists canonical names and aliases for search', () => {
    expect(listSearchableExerciseNames()).toEqual(
      expect.arrayContaining(['Push-Up', 'press-up', 'Swiss-Bar Bench Press'])
    );
  });

  it('returns only issues supported by the selected exercise', () => {
    expect(getSupportedExerciseIssues('Swiss-Bar Bench Press').map(({ id }) => id)).toEqual([
      'grip-handle:too-small',
    ]);
  });

  it('orders adjustments before replacements while retaining authored order', () => {
    expect(
      getExerciseRecommendations('Swiss-Bar Bench Press', 'grip-handle:too-small').map(
        ({ kind }) => kind
      )
    ).toEqual(['adjustment', 'replacement']);
  });
});
