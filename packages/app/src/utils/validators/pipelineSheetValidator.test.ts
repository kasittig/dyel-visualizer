import { describe, it, expect } from 'vitest';
import { validateSheetCsv } from './pipelineSheetValidator';

const GOOD = `date,exercise,weight (lbs),reps,sets
2024-11-04,Squat,405,2,1
2024-11-04,SSB Squat,335,3,1
2024-11-06,Bench Press,245,2,1
2024-11-08,Deadlift,455,2,1`;

const NO_HEADER = `foo,bar
1,2`;

const MISSING_COLS = `date,exercise,reps
2024-11-04,Squat,2`;

const BAD_ROWS = `date,exercise,weight (kg),reps
2024-11-04,Squat,405,2
not-a-date,,abc,-1`;

describe('validateSheetCsv (pipeline-native)', () => {
  it.each([
    ['returns ok for valid sheet', GOOD, 'ok', 4, 4],
    ['returns error when no header found', NO_HEADER, 'error', 0, 0],
    ['returns error for missing required columns', MISSING_COLS, 'error', 0, 0],
    ['handles invalid data rows', BAD_ROWS, 'warning', 2, 1],
  ])('%s', (_, csv, expectedVerdict, expectedTotal, expectedParsed) => {
    const r = validateSheetCsv(csv);
    expect(r.verdict).toBe(expectedVerdict);
    expect(r.rows.total).toBe(expectedTotal);
    if (expectedVerdict !== 'error') {
      expect(r.rows.parsed).toBe(expectedParsed);
    }
  });

  it('detects lift types correctly', () => {
    const r = validateSheetCsv(GOOD);
    expect(r.verdict).toBe('ok');
    expect(r.rows.liftTypes.squat).toBe(2);
    expect(r.rows.liftTypes.bench).toBe(1);
    expect(r.rows.liftTypes.deadlift).toBe(1);
    expect(r.rows.liftTypes.accessory).toBe(0);
  });

  it('warns when date column is absent', () => {
    const noDate = `exercise,weight (lbs),reps\nSquat,315,5`;
    const r = validateSheetCsv(noDate);
    expect(r.verdict).toBe('warning');
    expect(r.columns.hasDate).toBe(false);
    expect(r.warnings.some((w) => w.includes("today's date"))).toBe(true);
  });

  it('warns when no unit on weight column', () => {
    const noUnit = `date,exercise,weight,reps\n2024-01-01,Squat,400,2`;
    const r = validateSheetCsv(noUnit);
    expect(r.columns.weightUnit).toBeNull();
    expect(r.warnings.some((w) => w.includes('unit'))).toBe(true);
  });

  it('detects weight unit from column header', () => {
    const kg = `date,exercise,weight (kg),reps\n2024-01-01,Squat,180,2`;
    const r1 = validateSheetCsv(kg);
    expect(r1.columns.weightUnit).toBe('kg');

    const lbs = `date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,2`;
    const r2 = validateSheetCsv(lbs);
    expect(r2.columns.weightUnit).toBe('lbs');
  });

  it('requires exercise and weight columns', () => {
    const r = validateSheetCsv(`date,reps\n2024-01-01,5`);
    expect(r.verdict).toBe('error');
    expect(r.issues.some((i) => i.includes('exercise'))).toBe(true);
    expect(r.issues.some((i) => i.includes('weight'))).toBe(true);
  });

  it('warns when only accessories are recognized', () => {
    const acc = `date,exercise,weight (lbs),reps\n2024-01-01,bicep curl,30,10`;
    const r = validateSheetCsv(acc);
    expect(r.warnings.some((w) => w.includes('only accessories'))).toBe(true);
  });
});
