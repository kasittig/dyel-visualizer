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
    ['allows units: header line', 'units: kg\n2024-01-05 comp squat 140 x 5', 'ok', 1, 1],
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
    expect(noDate.verdict).toBe('error');
    expect(noDate.issues.some((i) => i.includes('YYYY-MM-DD'))).toBe(true);
  });
});
