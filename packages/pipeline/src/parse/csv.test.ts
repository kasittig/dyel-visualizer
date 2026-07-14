import { describe, it, expect } from 'vitest';
import { csvParser } from './csv';
import { ParseError } from './parser';
import type { ParseContext } from './parser';

const ctx: ParseContext = { fallback: 'lbs' };
const parse = (content: string) => csvParser.parse({ name: 'sheet.csv', content }, ctx);

describe('csvParser — Sets column', () => {
  it.each([
    [
      'stores the Sets column value as meta.sets',
      'Date,Exercise,Sets,Reps,Weight (lbs)\n2026-01-05,Bench,9,3,85\n',
      '9',
    ],
    [
      'defaults to no sets metadata when the column is absent',
      'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,85\n',
      undefined,
    ],
  ])('%s', (_, csv, expectedSets) => {
    const [record] = parse(csv);
    expect(record.meta?.sets).toBe(expectedSets);
  });
});

describe('csvParser — error handling', () => {
  it.each([
    ['invalid reps (non-numeric)', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,AMRAP,85\n'],
    ['invalid reps (max)', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,max,85\n'],
    ['invalid reps (dash)', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,-,85\n'],
    ['invalid weight', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,invalid\n'],
  ])('throws ParseError on %s', (_, csv) => {
    expect(() => parse(csv)).toThrow(ParseError);
  });
});

describe('csvParser — header scanning', () => {
  it.each([
    [
      'parses correctly with leading title row before header',
      'My Training Log\nDate,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,85\n',
      { date: new Date('2026-01-05').setHours(0, 0, 0, 0), exercise: 'Bench', reps: 3 },
    ],
    [
      'parses correctly with leading blank line before header',
      '\nDate,Exercise,Reps,Weight (lbs)\n2026-01-05,Squat,5,155\n',
      { date: new Date('2026-01-05').setHours(0, 0, 0, 0), exercise: 'Squat', reps: 5 },
    ],
    [
      'parses correctly with multiple leading non-header rows',
      'Training Log v2.0\nSession Data\nDate,Exercise,Reps,Weight (lbs)\n2026-01-05,Deadlift,2,225\n',
      { date: new Date('2026-01-05').setHours(0, 0, 0, 0), exercise: 'Deadlift', reps: 2 },
    ],
  ])('%s', (_, csv, expected) => {
    const [record] = parse(csv);
    expect(record.date).toBe(expected.date);
    expect(record.exercise).toBe(expected.exercise);
    expect(record.reps).toBe(expected.reps);
  });

  it('reports correct line number for ParseError when header is not on line 1', () => {
    const csv = 'My Training Log\nDate,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,invalid,85\n';
    try {
      parse(csv);
      expect.fail('should have thrown ParseError');
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).line).toBe(3);
    }
  });

  it('reports correct line number for ParseError with multiple leading rows', () => {
    const csv = 'Title\nNotes\nDate,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,bad,85\n';
    try {
      parse(csv);
      expect.fail('should have thrown ParseError');
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).line).toBe(4);
    }
  });
});
