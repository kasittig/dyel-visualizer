import { describe, expect, it } from 'vitest';
import {
  EXERCISE_ALTERNATIVES_CATALOG,
  getExerciseFamily,
  getExerciseRecommendations,
  getSupportedExerciseIssues,
  listSearchableExerciseNames,
  resolveAlternativeExercise,
} from './exerciseAlternatives';

describe('exercise alternatives', () => {
  it.each([
    ['canonical', 'Push-Up', 'push-up'],
    ['case-insensitive alias', 'PRESS-UP', 'push-up'],
    ['trimmed alias', '  RDL ', 'romanian-deadlift'],
    ['base squat display name', 'Squat', 'back-squat'],
    ['unhyphenated trap-bar display name', 'Trap Bar Deadlift', 'trap-bar-deadlift'],
  ])('resolves a %s', (_, name, id) => expect(resolveAlternativeExercise(name)?.id).toBe(id));

  it('documents unknown input with empty/null results', () => {
    expect(resolveAlternativeExercise('unknown')).toBeNull();
    expect(getSupportedExerciseIssues('unknown')).toEqual([]);
    expect(getExerciseRecommendations('unknown', 'equipment-unavailable')).toEqual([]);
  });

  it('lists canonical names and aliases for search', () => {
    expect(listSearchableExerciseNames()).toEqual(
      expect.arrayContaining(['Push-Up', 'press-up', 'Swiss-Bar Bench Press'])
    );
  });

  it('returns only supported issue choices', () => {
    expect(getSupportedExerciseIssues('Swiss-Bar Bench Press').map(({ id }) => id)).toEqual([
      'grip-handle:too-small',
      'equipment-unavailable',
    ]);
  });

  it.each([
    ['Push-Up', 'bench'],
    ['Belt Squat', 'squat'],
    ['Cable Pull-Through', 'deadlift'],
    ['unknown', null],
  ])('classifies %s in its powerlifting family', (exercise, expected) => {
    expect(getExerciseFamily(exercise)).toBe(expected);
  });

  it('orders adjustments before replacements while preserving authored group order', () => {
    expect(
      getExerciseRecommendations('Swiss-Bar Bench Press', 'grip-handle:too-small').map(
        ({ id }) => id
      )
    ).toEqual(['swiss-wider', 'swiss-flex', 'swiss-barbell']);
  });

  it('regresses Swiss-bar small-handle recommendations', () => {
    const recommendations = getExerciseRecommendations(
      'football bar bench',
      'grip-handle:too-small'
    );
    expect(recommendations[0]).toMatchObject({
      kind: 'adjustment',
      title: 'Use a wider handle pair',
    });
    expect(recommendations.slice(1).map(({ kind }) => kind)).toEqual([
      'replacement',
      'replacement',
    ]);
  });

  it('regresses push-up maximum-load recommendations', () => {
    const recommendations = getExerciseRecommendations(
      'pushup',
      'loading-range:maximum-resistance-too-light'
    );
    expect(recommendations[0]).toMatchObject({
      kind: 'adjustment',
      title: 'Band-Resisted Push-Up',
    });
    expect(recommendations[0]?.whyItHelps).toContain('band tension increasing toward lockout');
  });

  it.each([
    ['Back Squat', ['Belt Squat', 'Leg Press']],
    ['Conventional Deadlift', ['Hip Thrust', 'Cable Pull-Through']],
    ['Romanian Deadlift', ['Hip Thrust', 'Cable Pull-Through']],
  ])('offers lower-direct-load alternatives for %s', (exercise, expected) => {
    const recommendations = getExerciseRecommendations(exercise, 'avoid-spinal-loading');
    expect(recommendations.map(({ title }) => title)).toEqual(expected);
    expect(
      recommendations.every(({ whyItHelps }) =>
        whyItHelps.includes('does not eliminate spinal demand')
      )
    ).toBe(true);
  });

  it('maintains catalog integrity', () => {
    const names = new Set<string>();
    expect(EXERCISE_ALTERNATIVES_CATALOG.length).toBeGreaterThanOrEqual(15);
    expect(EXERCISE_ALTERNATIVES_CATALOG.length).toBeLessThanOrEqual(25);
    for (const exercise of EXERCISE_ALTERNATIVES_CATALOG) {
      expect(getExerciseFamily(exercise.name)).not.toBeNull();
      for (const name of [exercise.name, ...exercise.aliases]) {
        expect(names.has(name.toLocaleLowerCase())).toBe(false);
        names.add(name.toLocaleLowerCase());
        expect(resolveAlternativeExercise(name)?.id).toBe(exercise.id);
      }
      for (const issue of getSupportedExerciseIssues(exercise.name)) {
        const recommendations = getExerciseRecommendations(exercise.name, issue.id);
        expect(recommendations.length).toBeGreaterThan(0);
        for (const recommendation of recommendations) {
          expect(recommendation.whyItHelps.trim()).not.toBe('');
          expect(recommendation.staysSimilar.trim()).not.toBe('');
          expect(recommendation.changes.trim()).not.toBe('');
        }
      }
    }
  });
});
