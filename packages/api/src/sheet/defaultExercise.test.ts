import { describe, it, expect } from 'vitest';
import { defaultCompExerciseCanonical } from './defaultExercise';
import type { TaggedSetRecord } from '@dyel/pipeline';

/**
 * Test helper: builds a minimal TaggedSetRecord with specified tags and canonical.
 * Default tags: 'lift:squat' with 'comp-lift'.
 */
const rec = (canonical: string, tags: string[] = ['lift:squat', 'comp-lift']): TaggedSetRecord => ({
  date: Date.UTC(2024, 0, 1),
  exercise: canonical,
  weight: 100,
  reps: 1,
  canonical,
  tags: new Set(tags),
  effects: [],
  baselineRange: null,
});

describe('defaultCompExerciseCanonical', () => {
  it('returns null for empty input', () => {
    expect(defaultCompExerciseCanonical([])).toBeNull();
  });

  it('returns the first (and only) canonical for a single entry', () => {
    expect(defaultCompExerciseCanonical([rec('squat', ['lift:squat', 'comp-lift'])])).toBe('squat');
  });

  it('prefers competition exercise (standard bar, competition stance, no equipment, no addlWts)', () => {
    const records = [
      rec('squat-ssb', ['lift:squat', 'bar:ssb']),
      rec('squat', ['lift:squat', 'comp-lift']),
    ];
    expect(defaultCompExerciseCanonical(records)).toBe('squat');
  });

  it('falls back to first exercise when no competition exercise exists', () => {
    const records = [
      rec('squat-ssb', ['lift:squat', 'bar:ssb']),
      rec('squat-cambered', ['lift:squat', 'bar:cambered']),
    ];
    expect(defaultCompExerciseCanonical(records)).toBe('squat-ssb');
  });

  it('excludes exercises with equipment from competition selection', () => {
    const records = [
      rec('squat-box', ['lift:squat', 'equip:box']),
      rec('squat', ['lift:squat', 'comp-lift']),
    ];
    expect(defaultCompExerciseCanonical(records)).toBe('squat');
  });

  it('excludes exercises with addlWts from competition selection', () => {
    const records = [
      rec('squat-bands', ['lift:squat', 'addl:bands:1']),
      rec('squat', ['lift:squat', 'comp-lift']),
    ];
    expect(defaultCompExerciseCanonical(records)).toBe('squat');
  });

  it('prefers bench with pause equipment (commands) over plain bench', () => {
    const records = [
      rec('bench', ['lift:bench', 'comp-lift']),
      rec('bench-pause', ['lift:bench', 'equip:pause']),
    ];
    expect(defaultCompExerciseCanonical(records)).toBe('bench-pause');
  });

  it('returns plain bench when no pause variant exists', () => {
    const records = [
      rec('bench-ssb', ['lift:bench', 'bar:ssb']),
      rec('bench', ['lift:bench', 'comp-lift']),
    ];
    expect(defaultCompExerciseCanonical(records)).toBe('bench');
  });

  it('does not prefer pause equipment for non-bench lifts', () => {
    const records = [
      rec('squat-pause', ['lift:squat', 'equip:pause']),
      rec('squat', ['lift:squat', 'comp-lift']),
    ];
    expect(defaultCompExerciseCanonical(records)).toBe('squat');
  });

  it('prefers competition deadlift with matching stance', () => {
    const records = [
      rec('deadlift-sumo', ['lift:deadlift', 'stance:sumo']),
      rec('deadlift-conventional', ['lift:deadlift', 'stance:conventional']),
    ];
    expect(defaultCompExerciseCanonical(records, 'sumo')).toBe('deadlift-sumo');
  });

  it('prefers competition deadlift with matching stance (conventional)', () => {
    const records = [
      rec('deadlift-sumo', ['lift:deadlift', 'stance:sumo']),
      rec('deadlift-conventional', ['lift:deadlift', 'stance:conventional']),
    ];
    expect(defaultCompExerciseCanonical(records, 'conventional')).toBe('deadlift-conventional');
  });

  it('falls back to first deadlift when no stance match exists', () => {
    const records = [
      rec('deadlift-sumo', ['lift:deadlift', 'stance:sumo']),
      rec('deadlift-box', ['lift:deadlift', 'equip:box']),
    ];
    expect(defaultCompExerciseCanonical(records, 'conventional')).toBe('deadlift-sumo');
  });
});
