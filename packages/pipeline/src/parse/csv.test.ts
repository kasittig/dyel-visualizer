import { describe, it, expect } from 'vitest';
import { csvParser } from './csv';
import { ParseError } from './parser';
import type { ParseContext } from './parser';

const ctx: ParseContext = { fallback: 'lbs' };
const parse = (content: string) => csvParser.parse({ name: 'sheet.csv', content }, ctx);
const getDay = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

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

describe('csvParser — Notes column', () => {
  it.each([
    [
      'preserves mixed-case header notes exactly',
      'Date,Exercise,Reps,Weight (lbs),nOtEs\n2026-01-05,Bench,3,85,  paused reps  \n',
      '  paused reps  ',
    ],
    [
      'preserves commas inside quoted notes',
      'Date,Exercise,Reps,Weight (lbs),Notes\n2026-01-05,Bench,3,85,"Paused, then pressed"\n',
      'Paused, then pressed',
    ],
    [
      'omits empty notes',
      'Date,Exercise,Reps,Weight (lbs),Notes\n2026-01-05,Bench,3,85,\n',
      undefined,
    ],
    [
      'parses unchanged without a Notes column',
      'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,85\n',
      undefined,
    ],
  ])('%s', (_, csv, expectedNotes) => {
    expect(parse(csv)[0].meta?.notes).toBe(expectedNotes);
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

describe('csvParser — date formats', () => {
  it.each([
    ['ISO YYYY-MM-DD', '2026-02-06', '2026-02-06'],
    // Google Sheets' default published-CSV export renders unpadded M/D/YYYY (e.g. a real
    // sheet's "2/2/2026" for Feb 2, 2026) rather than ISO — must parse, not hard-fail the file.
    ['unpadded M/D/YYYY', '2/6/2026', '2026-02-06'],
    ['zero-padded MM/DD/YYYY', '02/06/2026', '2026-02-06'],
    ['single-digit month and day', '2/6/2026', '2026-02-06'],
    // A real published sheet formatted its date column as M/D/YY (e.g. "1/1/26"), which
    // hard-failed the whole file on the first row before this shape was accepted.
    ['unpadded M/D/YY (2-digit year)', '1/1/26', '2026-01-01'],
    ['zero-padded MM/DD/YY (2-digit year)', '03/02/26', '2026-03-02'],
  ])('parses %s', (_, dateCell, expected) => {
    const record = parse(`Date,Exercise,Reps,Weight (lbs)\n${dateCell},Bench,5,225\n`)[0];
    expect(record.date).toBe(getDay(expected));
  });

  it('throws ParseError on an unrecognized date shape', () => {
    expect(() => parse('Date,Exercise,Reps,Weight (lbs)\nFeb 6 2026,Bench,5,225\n')).toThrow(
      ParseError
    );
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

describe('csvParser — weight validation', () => {
  it.each([
    ['negative weight', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,-85\n'],
    [
      'malformed multi-decimal unit',
      'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,1.2.3lbs\n',
    ],
  ])('throws ParseError on %s', (_, csv) => {
    expect(() => parse(csv)).toThrow(ParseError);
  });

  it.each([
    ['225KG uppercase', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,225KG\n', 225],
    ['225Kg mixed case', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,225Kg\n', 225],
    [
      '225LBS uppercase',
      'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,225LBS\n',
      225 * 0.453592,
    ],
    [
      '225lbs lowercase',
      'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,3,225lbs\n',
      225 * 0.453592,
    ],
  ])('parses case-insensitive units: %s', (_, csv, expectedWeightKg) => {
    const [record] = parse(csv);
    expect(record.weight).toBeCloseTo(expectedWeightKg, 2);
  });
});

describe('csvParser — reps validation', () => {
  it.each([
    ['zero reps', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,0,85\n'],
    ['negative reps', 'Date,Exercise,Reps,Weight (lbs)\n2026-01-05,Bench,-5,85\n'],
  ])('throws ParseError on %s', (_, csv) => {
    expect(() => parse(csv)).toThrow(ParseError);
  });
});
