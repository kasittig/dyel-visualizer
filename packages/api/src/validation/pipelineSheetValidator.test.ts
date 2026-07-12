import { describe, expect, it } from 'vitest';
import { validateSheetCsv } from './pipelineSheetValidator';

const GOOD = `date,exercise,weight (lbs),reps,sets\n2024-11-04,Squat,405,2,1\n2024-11-04,SSB Squat,335,3,1\n2024-11-06,Bench Press,245,2,1\n2024-11-08,Deadlift,455,2,1`;

describe('validateSheetCsv (pipeline-native)', () => {
  it.each([
    ['valid sheet', GOOD, 'ok', 4, 4],
    ['no header', `foo,bar\n1,2`, 'error', 0, 0],
    ['missing required columns', `date,exercise,reps\n2024-11-04,Squat,2`, 'error', 0, 0],
    [
      'invalid data rows',
      `date,exercise,weight (kg),reps\n2024-11-04,Squat,405,2\nnot-a-date,,abc,-1`,
      'warning',
      2,
      1,
    ],
  ])('%s', (_, csv, verdict, total, parsed) => {
    const r = validateSheetCsv(csv);
    expect(r.verdict).toBe(verdict);
    expect(r.rows.total).toBe(total);
    if (verdict !== 'error') {
      expect(r.rows.parsed).toBe(parsed);
    }
  });

  it('detects lift types and columns correctly', () => {
    const r = validateSheetCsv(GOOD);
    expect(r.rows.liftTypes).toEqual({ squat: 2, bench: 1, deadlift: 1, accessory: 0 });

    const kg = validateSheetCsv(`date,exercise,weight (kg),reps\n2024-01-01,Squat,180,2`);
    expect(kg.columns.weightUnit).toBe('kg');
    expect(
      validateSheetCsv(`date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,2`).columns.weightUnit
    ).toBe('lbs');
  });

  it('enforces validation rules and warning conditions', () => {
    const noDate = validateSheetCsv(`exercise,weight (lbs),reps\nSquat,315,5`);
    expect(noDate.verdict).toBe('warning');
    expect(noDate.columns.hasDate).toBe(false);
    expect(noDate.warnings.some((w) => w.includes("today's date"))).toBe(true);

    const noUnit = validateSheetCsv(`date,exercise,weight,reps\n2024-01-01,Squat,400,2`);
    expect(noUnit.columns.weightUnit).toBeNull();
    expect(noUnit.warnings.some((w) => w.includes('unit'))).toBe(true);

    const missingCols = validateSheetCsv(`date,reps\n2024-01-01,5`);
    expect(missingCols.verdict).toBe('error');
    expect(missingCols.issues.some((i) => i.includes('exercise'))).toBe(true);

    const accOnly = validateSheetCsv(
      `date,exercise,weight (lbs),reps\n2024-01-01,bicep curl,30,10`
    );
    expect(accOnly.warnings.some((w) => w.includes('only accessories'))).toBe(true);
  });
});
