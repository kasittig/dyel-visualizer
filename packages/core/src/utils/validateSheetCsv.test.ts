import { validateSheetCsv } from "./validateSheetCsv";
import { describe, it, expect } from "vitest";

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

describe("validateSheetCsv", () => {
  it("returns ok for valid sheet", () => {
    const r = validateSheetCsv(GOOD);
    expect(r.verdict).toBe("ok");
    expect(r.rows.parsed).toBe(4);
    expect(r.rows.liftTypes.squat).toBe(2);
    expect(r.rows.liftTypes.bench).toBe(1);
    expect(r.rows.liftTypes.deadlift).toBe(1);
  });

  it("returns error when no header found", () => {
    const r = validateSheetCsv(NO_HEADER);
    expect(r.verdict).toBe("error");
    expect(r.headerRow).toBeNull();
  });

  it("returns error for missing required columns", () => {
    const r = validateSheetCsv(MISSING_COLS);
    expect(r.verdict).toBe("error");
    expect(r.issues.some((i) => i.includes("weight"))).toBe(true);
  });

  it("reports row-level issues", () => {
    const r = validateSheetCsv(BAD_ROWS);
    expect(r.verdict).toBe("warning");
    expect(r.rows.parsed).toBe(1);
    expect(r.rowIssues.length).toBeGreaterThan(0);
  });

  it("warns when no unit on weight column", () => {
    const noUnit = `date,exercise,weight,reps\n2024-01-01,Squat,400,2`;
    const r = validateSheetCsv(noUnit);
    expect(r.columns.weightUnit).toBeNull();
    expect(r.warnings.some((w) => w.includes("unit"))).toBe(true);
  });
});
