import { describe, it, expect } from 'vitest';
import { csvParser } from './csv';
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
