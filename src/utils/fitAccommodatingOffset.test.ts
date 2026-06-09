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
  makeRow("Bench", "2026-01-05", 300, 3), // comparable, e1RM = 330
  makeRow("Bench (Chains)", "2026-01-10", 225, 3), // chain; γ = 330/1.1 − 225 = 75
  // Window 1
  makeRow("Bench", "2026-01-26", 295, 3), // comparable, e1RM = 324.5
  makeRow("Bench (Chains)", "2026-02-01", 220, 3), // chain; γ = 324.5/1.1 − 220 = 75
  // Window 2  (Feb 17 = day 43 from Jan 5)
  makeRow("Bench", "2026-02-17", 310, 3), // comparable, e1RM = 341
  makeRow("Bench (Chains)", "2026-02-20", 230, 3), // chain; γ = 341/1.1 − 230 = 80
];
// mean γ = (75 + 75 + 80) / 3 = 76.667

describe("fitAccommodatingOffset", () => {
  describe("paired_blocks path (≥ 3 paired (window, variation) groups)", () => {
    it("returns method=paired_blocks", () => {
      const result = fitAccommodatingOffset(PAIRED_ROWS, "bench", "chains");
      expect(result.method).toBe("paired_blocks");
    });

    it("reports the correct number of paired groups", () => {
      const result = fitAccommodatingOffset(PAIRED_ROWS, "bench", "chains");
      expect(result.pairedBlockCount).toBe(3);
    });

    it("computes the mean γ from paired groups", () => {
      const result = fitAccommodatingOffset(PAIRED_ROWS, "bench", "chains");
      expect(result.offset).toBeCloseTo(76.667, 2);
    });
  });

  describe("global_mean fallback (< 3 paired groups, has same-variation comparable sets)", () => {
    // Bench comparable sets all in window 0; Bench chain sets in windows 1–2 → 0 paired groups
    const rows: ParsedConjugateRow[] = [
      makeRow("Bench", "2026-01-05", 300, 3), // comparable, e1RM = 330
      makeRow("Bench", "2026-01-08", 290, 5), // comparable, e1RM ≈ 338.33
      makeRow("Bench (Chains)", "2026-02-15", 240, 3), // chain bar e1RM = 264
      makeRow("Bench (Chains)", "2026-02-20", 250, 5), // chain bar e1RM ≈ 291.67
    ];
    // meanCmp = (330 + 338.33) / 2 = 334.17
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
      // If chain sets appear stronger than comparable sets, offset is 0, not negative
      const invertedRows: ParsedConjugateRow[] = [
        makeRow("Bench", "2026-01-05", 200, 3),
        makeRow("Bench (Chains)", "2026-02-15", 300, 3),
      ];
      expect(fitAccommodatingOffset(invertedRows, "bench", "chains").offset).toBe(0);
    });

    it("averages per-variation offsets independently when multiple base variations are present", () => {
      // Floor Press: comparable e1RM ≈ 308, chain bar e1RM ≈ 247.5 → offset ≈ 60.5
      // Bench:       comparable e1RM = 330, chain bar e1RM = 264    → offset = 66
      // global mean = (60.5 + 66) / 2 = 63.25  (one offset per base variation, equal weight)
      const rows: ParsedConjugateRow[] = [
        makeRow("Floor Press", "2026-01-05", 280, 3), // comparable, e1RM = 308
        makeRow("Floor Press (Chains)", "2026-02-15", 225, 3), // chain bar e1RM = 247.5
        makeRow("Bench", "2026-01-05", 300, 3), // comparable, e1RM = 330
        makeRow("Bench (Chains)", "2026-02-15", 240, 3), // chain bar e1RM = 264
      ];
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("global_mean");
      expect(result.offset).toBeCloseTo(63.25, 1);
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

    it("returns method=default when chain sets exist but no comparable variation to pair with", () => {
      // Floor Press (chain) has no Floor Press (comparable) → can't estimate γ for that variation
      const rows = [
        makeRow("Floor Press (Chains)", "2026-01-05", 225, 3),
        makeRow("Floor Press (Chains)", "2026-02-01", 230, 3),
      ];
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("default");
      expect(result.modifiedSetCount).toBe(2);
    });

    it("returns method=default when chain and comparable sets exist but for different variations", () => {
      // Bench (comparable) cannot be used to calibrate Floor Press (Chains)
      const rows = [
        makeRow("Bench", "2026-01-05", 300, 3),
        makeRow("Floor Press (Chains)", "2026-02-15", 225, 3),
      ];
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("default");
    });

    it("ignores rows from a different lift type", () => {
      const rows = [
        makeRow("Squat", "2026-01-05", 400, 3),
        makeRow("Squat (Chains)", "2026-01-10", 315, 3),
        makeRow("Squat", "2026-01-26", 405, 3),
        makeRow("Squat (Chains)", "2026-02-01", 320, 3),
        makeRow("Squat", "2026-02-17", 410, 3),
        makeRow("Squat (Chains)", "2026-02-20", 325, 3),
      ];
      // Asking for bench chains on squat-only data → default
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("default");
      expect(result.modifiedSetCount).toBe(0);
    });
  });

  describe("variation-level pairing", () => {
    it("does not pair Floor Press (comparable) with Bench (Chains)", () => {
      // 3 windows, each with Floor Press straight + Bench (Chains), but different base variations
      const rows: ParsedConjugateRow[] = [
        makeRow("Floor Press", "2026-01-05", 300, 3),
        makeRow("Bench (Chains)", "2026-01-10", 225, 3),
        makeRow("Floor Press", "2026-01-26", 295, 3),
        makeRow("Bench (Chains)", "2026-02-01", 220, 3),
        makeRow("Floor Press", "2026-02-17", 310, 3),
        makeRow("Bench (Chains)", "2026-02-20", 230, 3),
      ];
      // Floor Press ≠ Bench base variation → no valid groups → default
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("default");
    });

    it("pairs Floor Press with Floor Press (Chains) and Bench with Bench (Chains) independently", () => {
      // Floor Press windows: γ = 280-205=75, 275-200=75, 285-210=75
      // Bench windows:       γ = 300-225=75, 295-220=75, 310-230=80
      // 6 paired groups total → paired_blocks; mean γ = (5×75 + 80) / 6 ≈ 75.83
      const rows: ParsedConjugateRow[] = [
        makeRow("Floor Press", "2026-01-05", 280, 3),
        makeRow("Floor Press (Chains)", "2026-01-10", 205, 3),
        makeRow("Floor Press", "2026-01-26", 275, 3),
        makeRow("Floor Press (Chains)", "2026-02-01", 200, 3),
        makeRow("Floor Press", "2026-02-17", 285, 3),
        makeRow("Floor Press (Chains)", "2026-02-20", 210, 3),
        makeRow("Bench", "2026-01-05", 300, 3),
        makeRow("Bench (Chains)", "2026-01-10", 225, 3),
        makeRow("Bench", "2026-01-26", 295, 3),
        makeRow("Bench (Chains)", "2026-02-01", 220, 3),
        makeRow("Bench", "2026-02-17", 310, 3),
        makeRow("Bench (Chains)", "2026-02-20", 230, 3),
      ];
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("paired_blocks");
      expect(result.pairedBlockCount).toBe(6);
      expect(result.offset).toBeCloseTo(75.833, 2);
    });

    it("does not pair Bench (Bands) with Bench (Chains) — different base variations when fitting chains", () => {
      // Bench (Bands) has hasBands=true in its base key; Bench (Chains) has hasBands=false
      const rows: ParsedConjugateRow[] = [
        makeRow("Bench (Bands)", "2026-01-05", 300, 3),
        makeRow("Bench (Chains)", "2026-01-10", 225, 3),
      ];
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("default");
    });

    it("pairs Bench (Bands) with Bench (Chains, Bands) when fitting chains", () => {
      // Both have hasBands=true in their base key (chains excluded when fitting chains)
      const rows: ParsedConjugateRow[] = [
        makeRow("Bench (Bands)", "2026-01-05", 295, 3), // comparable for chains+bands
        makeRow("Bench (Chains, Bands)", "2026-01-10", 220, 3), // modified (chains+bands)
        makeRow("Bench (Bands)", "2026-01-26", 290, 3),
        makeRow("Bench (Chains, Bands)", "2026-02-01", 215, 3),
        makeRow("Bench (Bands)", "2026-02-17", 300, 3),
        makeRow("Bench (Chains, Bands)", "2026-02-20", 225, 3),
      ];
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("paired_blocks");
      expect(result.pairedBlockCount).toBe(3);
    });
  });

  describe("alpha coefficient fitting", () => {
    it("computes alpha when chain sets have labeled weights (paired_blocks path)", () => {
      // Use PAIRED_ROWS where chain sets have explicit weight labels.
      // offset ≈ 76.667 lbs, nominal weight = 100 lbs → alpha ≈ 0.767
      const labeledRows: ParsedConjugateRow[] = PAIRED_ROWS.map((r) => {
        if (!r.lift || !r.lift.variation.hasChains) return r;
        const lift = parseConjugateLift(r.row.exercise.replace("(Chains)", "(100 lbs chains)"));
        return { ...r, lift, label: lift ? conjugateLiftLabel(lift) : null };
      });
      const result = fitAccommodatingOffset(labeledRows, "bench", "chains");
      expect(result.method).toBe("paired_blocks");
      expect(result.alpha).not.toBeNull();
      expect(result.nominalModifierWeight).toBeCloseTo(100, 0);
      // alpha × 100 ≈ offset
      expect(result.alpha! * 100).toBeCloseTo(result.offset, 1);
    });

    it("infers chain weight for unlabeled sessions from labeled ones in the same variation group", () => {
      // Two sessions have labels, one does not. All three pair with straight work.
      const rows: ParsedConjugateRow[] = [
        // Window 0: labeled chain set
        makeRow("Bench", "2026-01-05", 300, 3),
        {
          ...makeRow("Bench (Chains)", "2026-01-10", 225, 3),
          ...(() => {
            const lift = parseConjugateLift("Bench (80 lbs chains)");
            return { lift, label: lift ? conjugateLiftLabel(lift) : null };
          })(),
        },
        // Window 1: unlabeled chain set (same variation, inferred weight = 80)
        makeRow("Bench", "2026-01-26", 295, 3),
        makeRow("Bench (Chains)", "2026-02-01", 220, 3),
        // Window 2: labeled chain set
        makeRow("Bench", "2026-02-17", 310, 3),
        {
          ...makeRow("Bench (Chains)", "2026-02-20", 230, 3),
          ...(() => {
            const lift = parseConjugateLift("Bench (80 lbs chains)");
            return { lift, label: lift ? conjugateLiftLabel(lift) : null };
          })(),
        },
      ];
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("paired_blocks");
      // nominalModifierWeight is inferred from the two labeled sessions
      expect(result.nominalModifierWeight).toBeCloseTo(80, 0);
      // alpha should be computed (not null) because labeled sessions exist
      expect(result.alpha).not.toBeNull();
    });

    it("returns alpha=null when no chain sets have a weight label", () => {
      // Unlabeled chain sets → nominalModifierWeight=null → alpha=null
      const result = fitAccommodatingOffset(PAIRED_ROWS, "bench", "chains");
      expect(result.alpha).toBeNull();
      expect(result.nominalModifierWeight).toBeNull();
    });

    it("returns nominalModifierWeight=null in the default fallback path", () => {
      const rows = [makeRow("Bench (Chains)", "2026-01-05", 225, 3)];
      const result = fitAccommodatingOffset(rows, "bench", "chains");
      expect(result.method).toBe("default");
      expect(result.alpha).toBeNull();
      expect(result.nominalModifierWeight).toBeNull();
    });
  });

  describe("reverse bands", () => {
    // Reverse bands are a deadlift-only modifier that reduce effective load.
    // Same window spacing as PAIRED_ROWS (Feb 17 = day 43 → window 2).
    // ε = barWeight − straightE1RM/1.1: 450−400=50, 445−395=50, 455−405=50 → mean ε = 50
    const rows: ParsedConjugateRow[] = [
      makeRow("Deadlift", "2026-01-05", 400, 3), // Window 0 comparable, e1RM = 440
      makeRow("Deadlift (Reverse Bands)", "2026-01-10", 450, 3), // Window 0, ε = 50
      makeRow("Deadlift", "2026-01-26", 395, 3), // Window 1 comparable, e1RM = 434.5
      makeRow("Deadlift (Reverse Bands)", "2026-02-01", 445, 3), // Window 1, ε = 50
      makeRow("Deadlift", "2026-02-17", 405, 3), // Window 2 comparable, e1RM = 445.5
      makeRow("Deadlift (Reverse Bands)", "2026-02-20", 455, 3), // Window 2, ε = 50
    ];

    it("returns method=paired_blocks for reverse bands with enough data", () => {
      expect(fitAccommodatingOffset(rows, "deadlift", "reverseBands").method).toBe("paired_blocks");
    });

    it("computes a positive offset (reverse bands reduce effective load)", () => {
      const result = fitAccommodatingOffset(rows, "deadlift", "reverseBands");
      expect(result.offset).toBeCloseTo(50, 1);
    });
  });
});
