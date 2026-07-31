import { describe, expect, it } from 'vitest';
import { parseTextData } from './parseTextData.ts';

describe('parseTextData', () => {
  it('handles empty or unparseable input scenarios', () => {
    expect(parseTextData('')).toEqual([]);
    expect(parseTextData('just some words\nmore words')).toEqual([]);
  });

  it.each([
    ['rep-max grammar', 'comp squat 1rm 300lbs', 'comp squat', 300 * 0.453592, 1, 'lbs'],
    [
      'plain multiplication grammar',
      'comp bench 225lbs x5',
      'comp bench',
      225 * 0.453592,
      5,
      'lbs',
    ],
    ['implicit reps fallback', 'comp bench 225lbs', 'comp bench', 225 * 0.453592, 1, 'lbs'],
  ])('parses line item with the pipeline grammar: %s', (_, line, exercise, weight, reps, unit) => {
    const [res] = parseTextData(line);
    expect(res).toBeDefined();
    if (!res) {
      throw new Error('Parsing failed');
    }
    expect(res).toMatchObject({ exercise, weight, reps, meta: { rawUnit: unit } });
  });

  it('evaluates multiple independent entries and unit context loops', () => {
    const mixed = parseTextData(
      'comp squat 1rm 300lbs\ncomp bench 225lbs x5\ncomp deadlift 3rm 180kg'
    );
    expect(mixed).toHaveLength(3);
    expect(mixed[0].meta?.rawUnit).toBe('lbs');
    expect(mixed[1].meta?.rawUnit).toBe('lbs');
    expect(mixed[2].meta?.rawUnit).toBe('kg');

    expect(parseTextData('comp squat 300', 'kg')[0].meta?.rawUnit).toBe('kg');
    expect(parseTextData('comp squat 1rm 300', 'kg')[0].meta?.rawUnit).toBe('kg');
  });

  it('uses provided now parameter for all parsed entries', () => {
    const fixedDate = new Date('2025-01-15T10:30:00Z');
    const mixed = parseTextData(
      'comp squat 1rm 300lbs\ncomp bench 225lbs x5\ncomp deadlift 3rm 180kg',
      'lbs',
      fixedDate
    );
    expect(mixed).toHaveLength(3);
    // All entries should have the exact same date
    const expected = Date.UTC(2025, 0, 15);
    expect(mixed[0].date).toBe(expected);
    expect(mixed[1].date).toBe(expected);
    expect(mixed[2].date).toBe(expected);
  });

  it('accepts an explicit ISO date anywhere in the line', () => {
    expect(parseTextData('comp squat 2024-11-04 405lbs x2')[0].date).toBe(Date.UTC(2024, 10, 4));
  });
});
