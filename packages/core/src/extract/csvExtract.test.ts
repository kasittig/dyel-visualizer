import { describe, it, expect } from 'vitest';
import { extractCsvRows } from './csvExtract';

describe('extractCsvRows', () => {
  it("returns null when no header row contains 'exercise'", () => {
    expect(extractCsvRows('date,weight,reps\n2024-01-01,100,5')).toBeNull();
  });

  it('returns null when the header is the last line (no data)', () => {
    expect(extractCsvRows('exercise,date,weight,reps')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(extractCsvRows('')).toBeNull();
  });

  it('finds a header offset below leading junk rows', () => {
    const csv = ['My Lifting Log', '', 'exercise,date,weight,reps', 'Squat,2024-01-01,300,1'].join(
      '\n'
    );
    const parsed = extractCsvRows(csv);
    expect(parsed?.headerIdx).toBe(2);
    expect(parsed?.rows).toHaveLength(1);
  });

  it('lowercases/trims headers and trims values', () => {
    const csv = 'Exercise , Date \nSquat , 2024-01-01 ';
    const parsed = extractCsvRows(csv);
    expect(parsed?.rows[0]).toEqual({ exercise: 'Squat', date: '2024-01-01' });
  });
});
