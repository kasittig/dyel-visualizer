import { describe, it, expect } from 'vitest';
import { validateTextData } from './pipelineFreeformValidator';

describe('validateTextData (pipeline-native freeform)', () => {
  it.each([
    [
      'returns ok for valid text',
      '2024-11-04 comp squat 405lbs x2\n2024-11-06 comp bench 245lbs x2\n2024-11-08 comp deadlift 455lbs x2',
      'ok',
      3,
      3,
    ],
    ['returns error for empty text', ' \n ', 'error', 0, 0],
    [
      'returns warning when mixed',
      '2024-11-04 comp squat 405lbs x2\nnot a valid line at all here',
      'warning',
      2,
      1,
    ],
    ['returns error when no lines parse', 'gibberish\nmore gibberish', 'error', 2, 0],
    ['handles rep-max lines', '2024-11-04 comp squat 1rm 405lbs', 'ok', 1, 1],
    ['allows units: header line', 'units: kg\n2024-01-05 comp squat 140 x 5', 'warning', 1, 1],
  ])('%s', (_, text, verdict, total, parsed) => {
    const r = validateTextData(text);
    expect(r.verdict).toBe(verdict);
    expect(r.rows.total).toBe(total);
    expect(r.rows.parsed).toBe(parsed);
  });

  it('detects lift types and enforces formatting constraints', () => {
    const r = validateTextData(
      '2024-11-04 comp squat 405lbs x2\n2024-11-06 comp bench 245lbs x2\n2024-11-08 comp deadlift 455lbs x2'
    );
    expect(r.verdict).toBe('ok');
    expect(r.rows.liftTypes).toEqual({ squat: 1, bench: 1, deadlift: 1, accessory: 0 });

    const acc = validateTextData('2024-11-04 bicep curl 30lbs x10');
    expect(acc.warnings.some((w) => w.includes('only accessories'))).toBe(true);

    const noDate = validateTextData('comp squat 405lbs x2');
    expect(noDate.verdict).toBe('ok');
    expect(noDate.rows.liftTypes.squat).toBe(1);
  });

  it('counts recognized variations from qualifying history rather than names alone', () => {
    expect(
      validateTextData(
        '2024-11-04 incline bench 225lbs x8 @8\n2024-11-11 incline bench 245lbs x3 @9\n2024-11-06 squat 315lbs x3 @8\n2024-11-08 face pulls 40lbs x12'
      ).rows.liftTypes
    ).toEqual({ squat: 0, bench: 2, deadlift: 0, accessory: 2 });
  });

  it('surfaces production parser errors with their original line numbers', () => {
    const result = validateTextData('comp squat 405lbs x2\ninvalid\ncomp bench 225lbs x3');
    expect(result.rows).toMatchObject({ total: 3, parsed: 2 });
    expect(result.rowIssues).toEqual([
      expect.objectContaining({ row: 2, issues: [expect.stringContaining('No weight')] }),
    ]);
  });
});
