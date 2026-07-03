import { describe, expect, it } from 'vitest';
import { textLineToRow } from './textLineToRow';

describe('textLineToRow', () => {
  describe('rep-max grammar', () => {
    it('parses an exercise name with a unit-annotated rep-max as weight/reps', () => {
      expect(textLineToRow('comp squat 1rm 300lbs')).toEqual({
        exercise: 'comp squat',
        'weight (lbs)': '300',
        reps: '1',
      });
    });

    it('parses kg', () => {
      expect(textLineToRow('comp bench 3rm 140kg')).toEqual({
        exercise: 'comp bench',
        'weight (kg)': '140',
        reps: '3',
      });
    });

    it('parses without a unit', () => {
      expect(textLineToRow('comp deadlift 5rm 405')).toEqual({
        exercise: 'comp deadlift',
        weight: '405',
        reps: '5',
      });
    });

    it('does not treat a token that only looks like a rep-max token as one', () => {
      expect(textLineToRow('comp squat 1rmx 300')).toEqual({
        exercise: 'comp squat 1rmx',
        weight: '300',
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

  describe('sets x reps @ weight grammar', () => {
    it('strips the dash, sets x reps token, and @ separator out of the exercise name', () => {
      expect(textLineToRow('2/2/2026 Box Squat - 1x1 @ 205')).toEqual({
        exercise: 'Box Squat',
        weight: '205',
        reps: '1',
        sets: '1',
        date: '2026-02-02',
      });
    });

    it('parses multiple sets and reps with a unit', () => {
      expect(textLineToRow('Bench - 3x5 @ 225lbs')).toEqual({
        exercise: 'Bench',
        'weight (lbs)': '225',
        reps: '5',
        sets: '3',
      });
    });

    it('parses kg', () => {
      expect(textLineToRow('Bench - 3x5 @ 225kg')).toEqual({
        exercise: 'Bench',
        'weight (kg)': '225',
        reps: '5',
        sets: '3',
      });
    });

    it('does not require a leading dash', () => {
      expect(textLineToRow('Squat 1x1 @ 205')).toEqual({
        exercise: 'Squat',
        weight: '205',
        reps: '1',
        sets: '1',
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
        'weight (lbs)': '300',
        reps: '1',
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
