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
    ['returns error for empty text', '   \n  ', 'error', 0, 0],
    [
      'returns warning when some lines fail but others succeed',
      '2024-11-04 comp squat 405lbs x2\nnot a valid line at all here',
      'warning',
      2,
      1,
    ],
    ['returns error when no lines parse', 'gibberish\nmore gibberish', 'error', 2, 0],
    ['handles rep-max lines', '2024-11-04 comp squat 1rm 405lbs', 'ok', 1, 1],
  ])('%s', (_, text, expectedVerdict, expectedTotal, expectedParsed) => {
    const r = validateTextData(text);
    expect(r.verdict).toBe(expectedVerdict);
    expect(r.rows.total).toBe(expectedTotal);
    expect(r.rows.parsed).toBe(expectedParsed);
  });

  it('detects lift types correctly', () => {
    const r = validateTextData(
      '2024-11-04 comp squat 405lbs x2\n2024-11-06 comp bench 245lbs x2\n2024-11-08 comp deadlift 455lbs x2'
    );
    expect(r.verdict).toBe('ok');
    expect(r.rows.parsed).toBe(3);
    expect(r.rows.liftTypes.squat).toBe(1);
    expect(r.rows.liftTypes.bench).toBe(1);
    expect(r.rows.liftTypes.deadlift).toBe(1);
  });

  it('warns when only accessories are recognized', () => {
    const r = validateTextData('2024-11-04 bicep curl 30lbs x10');
    expect(r.warnings.some((w) => w.includes('only accessories'))).toBe(true);
  });

  it('requires YYYY-MM-DD date format at start of line', () => {
    const r = validateTextData('comp squat 405lbs x2');
    expect(r.verdict).toBe('error');
    expect(r.issues.some((i) => i.includes('YYYY-MM-DD'))).toBe(true);
  });

  it('handles multiple lines with varying exercises', () => {
    const text = `2024-01-05 comp squat 315 x 5
2024-01-05 comp bench 185 x 3
2024-01-05 comp deadlift 405 x 1`;
    const r = validateTextData(text);
    expect(r.verdict).toBe('ok');
    expect(r.rows.parsed).toBe(3);
  });

  it('allows units: header line', () => {
    const text = `units: kg
2024-01-05 comp squat 140 x 5`;
    const r = validateTextData(text);
    expect(r.verdict).toBe('ok');
    expect(r.rows.total).toBe(1);
    expect(r.rows.parsed).toBe(1);
  });
});
