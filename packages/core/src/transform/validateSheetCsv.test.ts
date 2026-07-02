import { validateSheetCsv } from './validateSheetCsv';
import { describe, it, expect } from 'vitest';

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

describe('validateSheetCsv', () => {
  it('returns ok for valid sheet', () => {
    const r = validateSheetCsv(GOOD);
    expect(r.verdict).toBe('ok');
    expect(r.rows.parsed).toBe(4);
    expect(r.rows.liftTypes.squat).toBe(2);
    expect(r.rows.liftTypes.bench).toBe(1);
    expect(r.rows.liftTypes.deadlift).toBe(1);
  });

  it('returns error when no header found', () => {
    const r = validateSheetCsv(NO_HEADER);
    expect(r.verdict).toBe('error');
    expect(r.headerRow).toBeNull();
  });

  it('returns error for missing required columns', () => {
    const r = validateSheetCsv(MISSING_COLS);
    expect(r.verdict).toBe('error');
    expect(r.issues.some((i) => i.includes('weight'))).toBe(true);
  });

  it('reports row-level issues', () => {
    const r = validateSheetCsv(BAD_ROWS);
    expect(r.verdict).toBe('warning');
    expect(r.rows.parsed).toBe(1);
    expect(r.rowIssues.length).toBeGreaterThan(0);
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

  it('recognizes rep-max columns as satisfying weight/reps requirements', () => {
    const repMax = `date,exercise,1rm (lbs),3rm,5rm\n2024-01-01,Squat,405,365,335`;
    const r = validateSheetCsv(repMax);
    expect(r.verdict).toBe('ok');
    expect(r.columns.hasRepMaxCols).toBe(true);
    expect(r.rows.parsed).toBe(3);
    expect(r.rows.liftTypes.squat).toBe(3);
  });

  it('errors when neither weight/reps nor rep-max columns are present', () => {
    const r = validateSheetCsv(MISSING_COLS);
    expect(r.verdict).toBe('error');
    expect(r.columns.hasRepMaxCols).toBe(false);
  });

  it('reports an invalid rep-max cell but keeps the other valid ones in the row', () => {
    const badCell = `date,exercise,1rm,3rm\n2024-01-01,Squat,405,not-a-number`;
    const r = validateSheetCsv(badCell);
    expect(r.verdict).toBe('warning');
    expect(r.rows.parsed).toBe(1);
    expect(r.rowIssues.some((i) => i.issues.some((msg) => msg.includes('3RM')))).toBe(true);
  });

  it('errors a row with only blank/invalid rep-max cells', () => {
    const allBlank = `date,exercise,1rm,3rm\n2024-01-01,Squat,,`;
    const r = validateSheetCsv(allBlank);
    expect(r.verdict).toBe('error');
    expect(r.rows.parsed).toBe(0);
  });

  it('reads weight unit from a rep-max column header', () => {
    const repMaxKg = `date,exercise,1rm (kg)\n2024-01-01,Squat,140`;
    const r = validateSheetCsv(repMaxKg);
    expect(r.columns.weightUnit).toBe('kg');
  });
});
