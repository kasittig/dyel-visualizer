import { describe, it, expect } from 'vitest';
import { csvParser } from './csv';
import { ParseError } from './parser';
import type { ParseContext } from './parser';

const ctx: ParseContext = { fallback: 'lbs' };
const parse = (content: string) => csvParser.parse({ name: 'sheet.csv', content }, ctx);
const getDay = (dateStr: string) => new Date(dateStr).setHours(0, 0, 0, 0);

describe('csvParser — Sets column', () => {
  it.each([
    [
      'stores value as meta.sets',
      'Date,Exercise,Sets,Reps,Weight (lbs)\n2026-01-05,Bench,9,3,85\n',
      '9',
    ],
    ['defaults when absent', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,85\n', undefined],
  ])('%s', (_, csv, expectedSets) => {
    expect(parse(csv)[0].meta?.sets).toBe(expectedSets);
  });
});

describe('csvParser — error handling', () => {
  it.each([
    ['non-numeric reps', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,AMRAP,85\n'],
    ['max reps', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,max,85\n'],
    ['dash reps', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,-,85\n'],
    ['invalid weight', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,invalid\n'],
  ])('throws ParseError on %s', (_, csv) => {
    expect(() => parse(csv)).toThrow(ParseError);
  });
});

describe('csvParser — header scanning', () => {
  it.each([
    [
      'leading title row',
      'My Training Log\nDate,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,85\n',
      '2026-01-05',
      'Bench',
      3,
    ],
    [
      'leading blank line',
      '\nDate,Exercise,Reps,Weight (lbs)\n2026-01-05,Squat,5,155\n',
      '2026-01-05',
      'Squat',
      5,
    ],
    [
      'multiple leading rows',
      'Training Log v2.0\nSession Data\nDate,Exercise,Reps,Weight (lbs)\n2026-01-05,Deadlift,2,225\n',
      '2026-01-05',
      'Deadlift',
      2,
    ],
  ])('%s', (_, csv, date, exercise, reps) => {
    const [record] = parse(csv);
    expect(record.date).toBe(getDay(date));
    expect(record.exercise).toBe(exercise);
    expect(record.reps).toBe(reps);
  });

  it.each([
    [
      'header on line 2',
      'My Training Log\nDate,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,invalid,85\n',
      3,
    ],
    [
      'header on line 3',
      'Title\nNotes\nDate,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,bad,85\n',
      4,
    ],
  ])('reports correct line number for ParseError when %s', (_, csv, expectedLine) => {
    expect(() => parse(csv)).toThrow(
      expect.objectContaining({ name: 'ParseError', line: expectedLine })
    );
  });
});
