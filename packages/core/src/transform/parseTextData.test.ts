import { describe, expect, it } from 'vitest';
import { parseTextData } from './parseTextData';

describe('parseTextData', () => {
  it('returns empty array for empty text', () => {
    expect(parseTextData('')).toEqual([]);
  });

  it('returns empty array for unparseable lines', () => {
    expect(parseTextData('just some words\nmore words')).toEqual([]);
  });

  it('parses a single rep-max line', () => {
    const result = parseTextData('comp squat 1rm 300lbs');
    expect(result).toHaveLength(1);
    expect(result[0][0].type).toBe('squat');
    expect(result[0][1].weight).toBe(300);
    expect(result[0][1].reps).toBe(1);
    expect(result[0][1].unit).toBe('lbs');
  });

  it('parses a single plain weight/reps line', () => {
    const result = parseTextData('comp bench 225lbs x5');
    expect(result).toHaveLength(1);
    expect(result[0][0].type).toBe('bench');
    expect(result[0][1].weight).toBe(225);
    expect(result[0][1].reps).toBe(5);
    expect(result[0][1].unit).toBe('lbs');
  });

  it('defaults reps to 1 when a plain line omits them', () => {
    const result = parseTextData('comp bench 225lbs');
    expect(result[0][1].reps).toBe(1);
  });

  it('parses multiple lines mixing both grammars and units, independently', () => {
    const result = parseTextData(
      'comp squat 1rm 300lbs\ncomp bench 225lbs x5\ncomp deadlift 3rm 180kg'
    );
    expect(result).toHaveLength(3);
    expect(result[0][1].unit).toBe('lbs');
    expect(result[1][1].unit).toBe('lbs');
    expect(result[2][1].unit).toBe('kg');
  });

  it('falls back to the default unit when a line has no unit annotation', () => {
    const result = parseTextData('comp squat 1rm 300', 'kg');
    expect(result[0][1].unit).toBe('kg');
  });
});
