import { describe, expect, it } from 'vitest';
import { textLineToRow } from './textLineToRow';

describe('textLineToRow', () => {
  describe('rep-max grammar', () => {
    it('parses an exercise name with a unit-annotated rep-max', () => {
      expect(textLineToRow('comp squat 1rm 300lbs')).toEqual({
        exercise: 'comp squat',
        '1rm (lbs)': '300',
      });
    });

    it('parses kg', () => {
      expect(textLineToRow('comp bench 3rm 140kg')).toEqual({
        exercise: 'comp bench',
        '3rm (kg)': '140',
      });
    });

    it('parses without a unit', () => {
      expect(textLineToRow('comp deadlift 5rm 405')).toEqual({
        exercise: 'comp deadlift',
        '5rm': '405',
      });
    });
  });

  describe('plain weight/reps grammar', () => {
    it('parses weight, unit, and reps', () => {
      expect(textLineToRow('bench 225lbs x5')).toEqual({
        exercise: 'bench',
        'weight (lbs)': '225',
        reps: '5',
      });
    });

    it('defaults reps to omitted (parsed downstream as 1) when absent', () => {
      expect(textLineToRow('bench 225lbs')).toEqual({
        exercise: 'bench',
        'weight (lbs)': '225',
      });
    });

    it('parses kg', () => {
      expect(textLineToRow('bench 225kg x5')).toEqual({
        exercise: 'bench',
        'weight (kg)': '225',
        reps: '5',
      });
    });

    it('parses without a unit', () => {
      expect(textLineToRow('bench 225 x5')).toEqual({
        exercise: 'bench',
        weight: '225',
        reps: '5',
      });
    });
  });

  describe('date token', () => {
    it('parses a leading ISO date', () => {
      expect(textLineToRow('2026-02-05 bench 225lbs x5')).toEqual({
        exercise: 'bench',
        'weight (lbs)': '225',
        reps: '5',
        date: '2026-02-05',
      });
    });

    it('parses a trailing slash date', () => {
      expect(textLineToRow('bench 225lbs x5 2/5/2026')).toEqual({
        exercise: 'bench',
        'weight (lbs)': '225',
        reps: '5',
        date: '2026-02-05',
      });
    });

    it('parses a month-name date with no year, defaulting to the current year', () => {
      const expectedYear = new Date().getFullYear();
      expect(textLineToRow('bench 225lbs x5 feb 5')).toEqual({
        exercise: 'bench',
        'weight (lbs)': '225',
        reps: '5',
        date: `${expectedYear}-02-05`,
      });
    });

    it('parses a rep-max line with a date', () => {
      expect(textLineToRow('2026-02-05 comp squat 1rm 300lbs')).toEqual({
        exercise: 'comp squat',
        '1rm (lbs)': '300',
        date: '2026-02-05',
      });
    });

    it('omits the date key when no date is present', () => {
      expect(textLineToRow('bench 225lbs x5')).not.toHaveProperty('date');
    });
  });

  it('returns null for an unparseable line', () => {
    expect(textLineToRow('just some words')).toBeNull();
  });
});
