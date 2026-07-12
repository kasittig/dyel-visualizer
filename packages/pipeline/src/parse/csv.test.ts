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
