import { describe, expect, it } from 'vitest';
import { validateSheetCsv } from './pipelineSheetValidator';

const GOOD = `date,exercise,weight (lbs),reps,sets\n2024-11-04,Squat,405,2,1\n2024-11-04,SSB Squat,335,3,1\n2024-11-06,Bench Press,245,2,1\n2024-11-08,Deadlift,455,2,1`;

const checkErr = (csv: string, text: string) =>
  expect(validateSheetCsv(csv).rowIssues[0]?.issues.some((i) => i.includes(text))).toBe(true);

describe('validateSheetCsv (pipeline-native)', () => {
  it.each([
    ['valid sheet', GOOD, 'ok', 4, 4],
    ['no header', 'foo,bar\n1,2', 'error', 0, 0],
    ['header only (no data rows)', 'date,exercise,weight (lbs),reps,sets', 'error', 0, 0],
    ['missing required columns', 'date,exercise,reps\n2024-11-04,Squat,2', 'error', 0, 0],
    [
      'invalid rows',
      'date,exercise,weight (kg),reps\n2024-11-04,Squat,405,2\nnot-a-date,,abc,-1',
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
    expect(validateSheetCsv(GOOD).rows.liftTypes).toEqual({
      squat: 2,
      bench: 1,
      deadlift: 1,
      accessory: 0,
    });
    expect(
      validateSheetCsv('date,exercise,weight (kg),reps\n2024-01-01,Squat,180,2').columns.weightUnit
    ).toBe('kg');
    expect(
      validateSheetCsv('date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,2').columns.weightUnit
    ).toBe('lbs');
  });

  it('promotes all rows for a variation only when its history contains a qualifying RM', () => {
    const csv = `date,exercise,weight (lbs),reps,rpe
2024-01-01,Incline Bench,185,8,8
2024-01-08,Incline Bench,225,2,9
2024-01-01,Squat,315,3,8
2024-01-01,Face Pull,40,12,`;

    expect(validateSheetCsv(csv).rows.liftTypes).toEqual({
      squat: 0,
      bench: 2,
      deadlift: 0,
      accessory: 2,
    });
  });

  it('does not treat multi-set speed work without RPE as rep-max evidence', () => {
    expect(
      validateSheetCsv('date,exercise,weight (lbs),reps,sets\n2024-01-01,Bench,185,3,9').rows
        .liftTypes
    ).toEqual({ squat: 0, bench: 0, deadlift: 0, accessory: 1 });
  });

  it('enforces validation rules and warning conditions', () => {
    const noDate = validateSheetCsv('exercise,weight (lbs),reps\nSquat,315,5');
    expect(noDate.verdict).toBe('warning');
    expect(noDate.warnings.some((w) => w.includes("today's date"))).toBe(true);

    const noUnit = validateSheetCsv('date,exercise,weight,reps\n2024-01-01,Squat,400,2');
    expect(noUnit.columns.weightUnit).toBeNull();
    expect(noUnit.warnings.some((w) => w.includes('unit'))).toBe(true);

    const missingCols = validateSheetCsv('date,reps\n2024-01-01,5');
    expect(missingCols.issues.some((i) => i.includes('exercise'))).toBe(true);

    const accOnly = validateSheetCsv(
      'date,exercise,weight (lbs),reps\n2024-01-01,bicep curl,30,10'
    );
    expect(accOnly.warnings.some((w) => w.includes('qualifying 1–3 rep-max history'))).toBe(true);
  });

  it('validates row variables independently', () => {
    expect(
      validateSheetCsv('date,exercise,weight (lbs),reps\n2024-01-01,Squat,,5').rows.parsed
    ).toBe(0);
    checkErr('date,exercise,weight (lbs),reps\n2024-01-01,Squat,,5', 'Weight is missing');
    checkErr('date,exercise,weight (lbs),reps\n2024-01-01,Squat,abc,5', 'Invalid weight');

    expect(
      validateSheetCsv('date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,').rows.parsed
    ).toBe(1);
    checkErr('date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,', 'Reps is missing');
    checkErr('date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,2.5', 'Invalid reps');
    checkErr('date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,-3', 'Invalid reps');
    checkErr('date,exercise,weight (lbs),reps\n2024-01-01,Squat,405,0', 'Invalid reps');

    expect(validateSheetCsv('date,exercise,weight (lbs),reps\n,Squat,405,2').rows.parsed).toBe(1);
    checkErr('date,exercise,weight (lbs),reps\n,Squat,405,2', 'Date is missing');
    checkErr('date,exercise,weight (lbs),reps\n2024-13-01,Squat,405,2', 'Invalid date');

    expect(
      validateSheetCsv('date,exercise,weight (lbs),reps,rpe\n2024-01-01,Squat,405,2,11').rows.parsed
    ).toBe(1);
    checkErr('date,exercise,weight (lbs),reps,rpe\n2024-01-01,Squat,405,2,11', 'Invalid RPE');
    checkErr('date,exercise,weight (lbs),reps,rpe\n2024-01-01,Squat,405,2,0.5', 'Invalid RPE');
    expect(
      validateSheetCsv('date,exercise,weight (lbs),reps,rpe\n2024-01-01,Squat,405,2,8').rowIssues
    ).toEqual([]);
  });

  it.each([
    [
      'leading title row',
      'My Squat Log\ndate,exercise,weight (lbs),reps,sets\n2024-11-04,Squat,405,2,1\n',
      1,
    ],
    [
      'leading blank lines',
      '\n\ndate,exercise,weight (lbs),reps,sets\n2024-11-04,Squat,405,2,1\n',
      2,
    ],
    ['first line', GOOD, 0],
  ])('locates header on %s', (_, csv, line) => {
    expect(validateSheetCsv(csv).headerRow).toBe(line);
  });

  it('reports headerRow: null when no header found', () => {
    expect(validateSheetCsv('foo,bar\n1,2').headerRow).toBeNull();
  });

  it('returns specific error message for header only (zero data rows)', () => {
    const result = validateSheetCsv('date,exercise,weight (lbs),reps,sets');
    expect(result.issues[0]).toBe('No data rows found. Add at least one row of exercise data.');
    expect(result.verdict).toBe('error');
  });
});
