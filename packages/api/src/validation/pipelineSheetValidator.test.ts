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

  it('validates per-row weight, reps, date, and RPE independently', () => {
    // Missing weight should fail the row
    const missingWeight = validateSheetCsv(`date,exercise,weight (lbs),reps\n2024-01-01,Squat,,5`);
    expect(missingWeight.rows.parsed).toBe(0);
    expect(missingWeight.rowIssues[0]?.issues.some((i) => i.includes('Weight is missing'))).toBe(
      true
    );

    // Invalid weight (non-numeric) should fail the row
    const invalidWeight = validateSheetCsv(
      `date,exercise,weight (lbs),reps\n2024-01-01,Squat,abc,5`
    );
    expect(invalidWeight.rows.parsed).toBe(0);
    expect(invalidWeight.rowIssues[0]?.issues.some((i) => i.includes('Invalid weight'))).toBe(true);

    // Missing reps should warn but not fail the row
    const missingReps = validateSheetCsv(`date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,`);
    expect(missingReps.rows.parsed).toBe(1);
    expect(missingReps.verdict).toBe('ok');
    expect(missingReps.rowIssues[0]?.issues.some((i) => i.includes('Reps is missing'))).toBe(true);

    // Invalid reps (non-integer) should fail the row
    const invalidReps = validateSheetCsv(
      `date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,2.5`
    );
    expect(invalidReps.rows.parsed).toBe(0);
    expect(invalidReps.rowIssues[0]?.issues.some((i) => i.includes('Invalid reps'))).toBe(true);

    // Negative reps should fail the row
    const negativeReps = validateSheetCsv(
      `date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,-3`
    );
    expect(negativeReps.rows.parsed).toBe(0);
    expect(negativeReps.rowIssues[0]?.issues.some((i) => i.includes('Invalid reps'))).toBe(true);

    // Zero reps should fail the row
    const zeroReps = validateSheetCsv(`date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,0`);
    expect(zeroReps.rows.parsed).toBe(0);
    expect(zeroReps.rowIssues[0]?.issues.some((i) => i.includes('Invalid reps'))).toBe(true);

    // Missing date should warn but not fail the row
    const missingDate = validateSheetCsv(`date,exercise,weight (lbs),reps\n,Squat,405,2`);
    expect(missingDate.rows.parsed).toBe(1);
    expect(missingDate.verdict).toBe('ok');
    expect(missingDate.rowIssues[0]?.issues.some((i) => i.includes('Date is missing'))).toBe(true);

    // Invalid date should fail the row
    const invalidDate = validateSheetCsv(`date,exercise,weight (lbs),reps\n2024-13-01,Squat,405,2`);
    expect(invalidDate.rows.parsed).toBe(0);
    expect(invalidDate.rowIssues[0]?.issues.some((i) => i.includes('Invalid date'))).toBe(true);

    // Invalid RPE (out of range) should warn but not fail the row
    const invalidRpe = validateSheetCsv(
      `date,exercise,weight (lbs),reps,rpe\n2024-01-01,Squat,405,2,11`
    );
    expect(invalidRpe.rows.parsed).toBe(1);
    expect(invalidRpe.verdict).toBe('ok');
    expect(invalidRpe.rowIssues[0]?.issues.some((i) => i.includes('Invalid RPE'))).toBe(true);

    // RPE below 1 should warn but not fail the row
    const rpeBelow1 = validateSheetCsv(
      `date,exercise,weight (lbs),reps,rpe\n2024-01-01,Squat,405,2,0.5`
    );
    expect(rpeBelow1.rows.parsed).toBe(1);
    expect(rpeBelow1.verdict).toBe('ok');
    expect(rpeBelow1.rowIssues[0]?.issues.some((i) => i.includes('Invalid RPE'))).toBe(true);

    // Valid RPE (within 1-10) should not produce warnings
    const validRpe = validateSheetCsv(
      `date,exercise,weight (lbs),reps,rpe\n2024-01-01,Squat,405,2,8`
    );
    expect(validRpe.rows.parsed).toBe(1);
    expect(validRpe.rowIssues).toEqual([]);
  });
});
