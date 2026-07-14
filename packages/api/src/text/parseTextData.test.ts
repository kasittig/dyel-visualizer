import { describe, expect, it } from 'vitest';
import { parseTextData } from './parseTextData.ts';

describe('parseTextData', () => {
  it('handles empty or unparseable input scenarios', () => {
    expect(parseTextData('')).toEqual([]);
    expect(parseTextData('just some words\nmore words')).toEqual([]);
  });

  it.each([
    ['rep-max grammar', 'comp squat 1rm 300lbs', 'squat', 300, 1, 'lbs'],
    ['plain multiplication grammar', 'comp bench 225lbs x5', 'bench', 225, 5, 'lbs'],
    ['implicit reps fallback', 'comp bench 225lbs', 'bench', 225, 1, 'lbs'],
  ])('parses line item: %s', (_, line, type, weight, reps, unit) => {
    const [res] = parseTextData(line);
    expect(res).toBeDefined();
    if (!res) {
      throw new Error('Parsing failed');
    }
    expect(res[0].type).toBe(type);
    expect(res[1]).toMatchObject({ weight, reps, unit });
  });

  it('evaluates multiple independent entries and unit context loops', () => {
    const mixed = parseTextData(
      'comp squat 1rm 300lbs\ncomp bench 225lbs x5\ncomp deadlift 3rm 180kg'
    );
    expect(mixed).toHaveLength(3);
    expect(mixed[0][1].unit).toBe('lbs');
    expect(mixed[1][1].unit).toBe('lbs');
    expect(mixed[2][1].unit).toBe('kg');

    expect(parseTextData('comp squat 300', 'kg')[0][1].unit).toBe('kg');
    expect(parseTextData('comp squat 1rm 300', 'kg')[0][1].unit).toBe('kg');
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
    expect(mixed[0][1].date).toEqual(fixedDate);
    expect(mixed[1][1].date).toEqual(fixedDate);
    expect(mixed[2][1].date).toEqual(fixedDate);
    // Verify they are the same object reference
    expect(mixed[0][1].date).toBe(mixed[1][1].date);
    expect(mixed[1][1].date).toBe(mixed[2][1].date);
  });
});
