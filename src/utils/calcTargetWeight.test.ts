import { describe, it, expect } from "vitest";
import { calcTargetWeight } from "./calcTargetWeight";
import { parseConjugateLift, conjugateLiftLabel } from "./parseConjugate";
import type { ParsedConjugateRow } from "./parseConjugate";
import type { SheetRow } from "../hooks/useSheetData";

const NOW = new Date("2026-06-09");

function makeRow(exercise: string, date: string, weight: number, reps: number): ParsedConjugateRow {
  const row: SheetRow = { date, exercise, weight: String(weight), reps: String(reps) };
  const lift = parseConjugateLift(exercise);
  return { row, lift, label: lift ? conjugateLiftLabel(lift) : null };
}

describe("calcTargetWeight", () => {
  it("returns null when there are no rows for the lift type", () => {
    const rows = [makeRow("Squat", "2026-06-01", 400, 3)];
    expect(calcTargetWeight(rows, "bench", 3, NOW)).toBeNull();
  });

  it("returns null when all rows are older than 12 weeks", () => {
    const rows = [makeRow("Bench", "2025-01-01", 300, 3)];
    expect(calcTargetWeight(rows, "bench", 3, NOW)).toBeNull();
  });

  it("computes the correct target weight from a single straight set", () => {
    // e1RM = 300 * (1 + 3/30) = 330; for 5 reps: 330 / (1 + 5/30) = 330 / 1.167 ≈ 282.9 → rounds to 282.5
    const rows = [makeRow("Bench", "2026-06-01", 300, 3)];
    const result = calcTargetWeight(rows, "bench", 5, NOW);
    expect(result).not.toBeNull();
    expect(result!.targetWeight).toBeCloseTo(282.5, 0);
  });

  it("returns the working e1RM as the target weight for 1 rep", () => {
    const rows = [makeRow("Bench", "2026-06-01", 300, 1)];
    const result = calcTargetWeight(rows, "bench", 1, NOW);
    expect(result).not.toBeNull();
    expect(result!.targetWeight).toBe(300);
  });

  it("rounds target weight to nearest 2.5 lbs", () => {
    // e1RM from 285×3 = 285 * 1.1 = 313.5; for 3 reps: 313.5 / 1.1 = 285.0 (exact)
    const rows = [makeRow("Bench", "2026-06-01", 285, 3)];
    const result = calcTargetWeight(rows, "bench", 3, NOW);
    expect(result!.targetWeight % 2.5).toBe(0);
  });

  it("picks the highest normalized e1RM across all variations in the trailing window", () => {
    const rows = [
      makeRow("Bench", "2026-06-01", 300, 3), // e1RM = 330
      makeRow("Floor Press", "2026-06-02", 315, 3), // e1RM = 346.5  ← best
      makeRow("Incline Bench Press", "2026-06-03", 280, 3), // e1RM = 308
    ];
    const result = calcTargetWeight(rows, "bench", 3, NOW);
    expect(result!.workingE1RM).toBe(347); // Math.round(346.5)
  });

  it("excludes sets older than 12 weeks from the e1RM calculation", () => {
    const rows = [
      makeRow("Bench", "2024-01-01", 400, 1), // very old heavy set — should be ignored
      makeRow("Bench", "2026-06-01", 300, 3), // recent set
    ];
    const result = calcTargetWeight(rows, "bench", 1, NOW);
    // If the old set were included, working e1RM would be 400; with only recent it should be 330
    expect(result!.workingE1RM).toBe(330);
  });

  it("uses all historical data (not just recent) to fit the chain offset", () => {
    // Build 3 paired windows spread over the past year, then a recent chain set
    const rows: ParsedConjugateRow[] = [
      // Paired windows for fitting (old enough to be outside 12-week window)
      makeRow("Bench", "2025-06-05", 300, 3),
      makeRow("Bench (Chains)", "2025-06-10", 225, 3),
      makeRow("Bench", "2025-07-01", 295, 3),
      makeRow("Bench (Chains)", "2025-07-08", 220, 3),
      makeRow("Bench", "2025-07-25", 305, 3),
      makeRow("Bench (Chains)", "2025-08-01", 228, 3),
      // Recent chain set (within 12 weeks)
      makeRow("Bench (Chains)", "2026-06-01", 235, 3),
    ];
    const result = calcTargetWeight(rows, "bench", 3, NOW);
    // Should be non-null: recent chain set normalized via fitted offset
    expect(result).not.toBeNull();
    expect(result!.fitMeta.chains.method).toBe("paired_blocks");
    expect(result!.sessionCount).toBe(1); // only one session in trailing 12 weeks
  });

  it("counts each unique date as one session", () => {
    const rows = [
      makeRow("Bench", "2026-06-01", 300, 3),
      makeRow("Bench", "2026-06-01", 280, 5), // same date, same session
      makeRow("Bench", "2026-06-05", 295, 3), // different date
    ];
    const result = calcTargetWeight(rows, "bench", 3, NOW);
    expect(result!.sessionCount).toBe(2);
  });
});
