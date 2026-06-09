import { describe, it, expect } from "vitest";
import { fitAccommodatingOffset } from "./fitAccommodatingOffset";
import { parseConjugateLift, conjugateLiftLabel } from "./parseConjugate";
import type { ParsedConjugateRow } from "./parseConjugate";
import type { SheetRow } from "../hooks/useSheetData";

function makeRow(exercise: string, date: string, weight: number, reps: number): ParsedConjugateRow {
  const row: SheetRow = { date, exercise, weight: String(weight), reps: String(reps) };
  const lift = parseConjugateLift(exercise);
  return { row, lift, label: lift ? conjugateLiftLabel(lift) : null };
}

// Three 21-day windows anchored to Jan 5 (the earliest date = minTime):
//   Window 0: days  0–20  (Jan  5 – Jan 25)
//   Window 1: days 21–41  (Jan 26 – Feb 15)
//   Window 2: days 42–62  (Feb 16 – Mar  8)
// Feb 15 = day 41 from Jan 5 → still window 1; Feb 17 = day 43 → window 2.
const PAIRED_ROWS: ParsedConjugateRow[] = [
  // Window 0
  makeRow("Bench", "2026-01-05", 300, 3), // straight, e1RM = 330
  makeRow("Bench (Chains)", "2026-01-10", 225, 3), // chain; γ = 330/1.1 − 225 = 75
  // Window 1
  makeRow("Bench", "2026-01-26", 295, 3), // straight, e1RM = 324.5
  makeRow("Bench (Chains)", "2026-02-01", 220, 3), // chain; γ = 324.5/1.1 − 220 = 75
  // Window 2  (Feb 17 = day 43 from Jan 5)
  makeRow("Bench", "2026-02-17", 310, 3), // straight, e1RM = 341
  makeRow("Bench (Chains)", "2026-02-20", 230, 3), // chain; γ = 341/1.1 − 230 = 80
];
// mean γ = (75 + 75 + 80) / 3 = 76.667

describe("fitAccommodatingOffset", () => {
  describe("paired_blocks path (≥ 3 paired windows)", () => {
    it("returns method=paired_blocks", () => {
      const result = fitAccommodatingOffset(PAIRED_ROWS, "bench", "chains");
      expect(result.method).toBe("paired_blocks");
    });

    it("reports the correct number of paired blocks", () => {
      const result = fitAccommodatingOffset(PAIRED_ROWS, "bench", "chains");
      expect(result.pairedBlockCount).toBe(3);
    });

    it("computes the mean γ from paired windows", () => {
      const result = fitAccommodatingOffset(PAIRED_ROWS, "bench", "chains");
      expect(result.offset).toBeCloseTo(76.667, 2);
    });
  });

  describe("global_mean fallback (< 3 paired windows, has straight sets)", () => {
    // Straight sets all in window 0; chain sets all in window 2 → 0 paired windows
    const rows: ParsedConjugateRow[] = [
      makeRow("Bench", "2026-01-05", 300, 3), // straight, e1RM = 330
      makeRow("Bench", "2026-01-08", 290, 5), // straight, e1RM ≈ 338.33
      makeRow("Bench (Chains)", "2026-02-15", 240, 3), // chain bar e1RM = 264
      makeRow("Bench (Chains)", "2026-02-20", 250, 5), // chain bar e1RM ≈ 291.67
    ];
    // meanStr = (330 + 338.33) / 2 = 334.17
    // meanMod = (264 + 291.67) / 2 = 277.83
    // offset = 334.17 - 277.83 = 56.33

    it("returns method=global_mean", () => {
      expect(fitAccommodatingOffset(rows, "bench", "chains").method).toBe("global_mean");
    });

    it("computes offset from session averages", () => {
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.offset).toBeCloseTo(56.33, 1);
    });

    it("floors the offset at 0", () => {
      // If chain sets appear stronger than straight sets (unusual), offset should be 0, not negative
      const invertedRows: ParsedConjugateRow[] = [
        makeRow("Bench", "2026-01-05", 200, 3),
        makeRow("Bench (Chains)", "2026-02-15", 300, 3),
      ];
      expect(fitAccommodatingOffset(invertedRows, "bench", "chains").offset).toBe(0);
    });
  });

  describe("default fallback", () => {
    it("returns method=default and offset=50 when no chain sets exist", () => {
      const rows = [makeRow("Bench", "2026-01-05", 300, 3)];
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("default");
      expect(result.offset).toBe(50);
      expect(result.modifiedSetCount).toBe(0);
    });

    it("returns method=default when chain sets exist but no straight sets to compare", () => {
      const rows = [
        makeRow("Bench (Chains)", "2026-01-05", 225, 3),
        makeRow("Bench (Chains)", "2026-02-01", 230, 3),
      ];
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("default");
      expect(result.modifiedSetCount).toBe(2);
    });

    it("ignores rows from a different lift type", () => {
      const rows = [
        makeRow("Squat", "2026-01-05", 400, 3),
        makeRow("Squat (Chains)", "2026-01-10", 315, 3),
        makeRow("Squat", "2026-01-26", 405, 3),
        makeRow("Squat (Chains)", "2026-02-01", 320, 3),
        makeRow("Squat", "2026-02-15", 410, 3),
        makeRow("Squat (Chains)", "2026-02-20", 325, 3),
      ];
      // Asking for bench chains on squat-only data → default
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("default");
      expect(result.modifiedSetCount).toBe(0);
    });
  });

  describe("reverse bands", () => {
    // Reverse bands are a deadlift-only modifier that reduce effective load.
    // Same window spacing as PAIRED_ROWS (Feb 17 = day 43 → window 2).
    // ε = barWeight − straightE1RM/1.1: 450−400=50, 445−395=50, 455−405=50 → mean ε = 50
    const rows: ParsedConjugateRow[] = [
      makeRow("Deadlift", "2026-01-05", 400, 3), // Window 0 straight, e1RM = 440
      makeRow("Deadlift (Reverse Bands)", "2026-01-10", 450, 3), // Window 0, ε = 50
      makeRow("Deadlift", "2026-01-26", 395, 3), // Window 1 straight, e1RM = 434.5
      makeRow("Deadlift (Reverse Bands)", "2026-02-01", 445, 3), // Window 1, ε = 50
      makeRow("Deadlift", "2026-02-17", 405, 3), // Window 2 straight, e1RM = 445.5
      makeRow("Deadlift (Reverse Bands)", "2026-02-20", 455, 3), // Window 2, ε = 50
    ];

    it("returns method=paired_blocks for reverse bands with enough data", () => {
      expect(fitAccommodatingOffset(rows, "deadlift", "reverseBands").method).toBe("paired_blocks");
    });

    it("computes a positive offset (bands reduce effective load)", () => {
      const result = fitAccommodatingOffset(rows, "deadlift", "reverseBands");
      expect(result.offset).toBeGreaterThan(0);
    });
  });

  describe("bands are excluded from straight sets when fitting chains", () => {
    it("does not count banded sets as straight work", () => {
      const rows: ParsedConjugateRow[] = [
        makeRow("Bench (Bands)", "2026-01-05", 300, 3), // banded, not straight
        makeRow("Bench (Chains)", "2026-01-10", 225, 3), // chain set
      ];
      // No straight sets → cannot do global_mean → default
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("default");
    });
  });
});
