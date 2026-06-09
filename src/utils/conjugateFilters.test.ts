import { describe, expect, it } from "vitest";
import { getConjugatePresence } from "./conjugateFilters";
import { parseConjugateRows } from "./parseConjugate";
import type { SheetRow } from "../hooks/useSheetData";

function rows(exercises: string[]): ReturnType<typeof parseConjugateRows> {
  return parseConjugateRows(exercises.map((exercise) => ({ exercise }) as SheetRow));
}

describe("getConjugatePresence", () => {
  it("returns empty presence for no rows", () => {
    const p = getConjugatePresence([]);
    expect(p.squat.bars.size).toBe(0);
    expect(p.bench.bars.size).toBe(0);
    expect(p.deadlift.hasChains).toBe(false);
  });

  describe("squat", () => {
    it("tracks bars present in data", () => {
      const p = getConjugatePresence(rows(["Squat", "Squat (SSB)"]));
      expect(p.squat.bars).toEqual(new Set(["standard", "ssb"]));
    });

    it("does not include bars not in data", () => {
      const p = getConjugatePresence(rows(["Squat"]));
      expect(p.squat.bars).toEqual(new Set(["standard"]));
      expect(p.squat.bars.has("ssb")).toBe(false);
    });

    it("detects box squat", () => {
      const p = getConjugatePresence(rows(["Squat"]));
      expect(p.squat.hasBox).toBe(false);
      const p2 = getConjugatePresence(rows(["Box Squat"]));
      expect(p2.squat.hasBox).toBe(true);
    });

    it("detects chains and bands", () => {
      const p = getConjugatePresence(rows(["Squat (Chains)", "Box Squat (Bands)"]));
      expect(p.squat.hasChains).toBe(true);
      expect(p.squat.hasBands).toBe(true);
    });
  });

  describe("bench", () => {
    it("tracks bars and angles present in data", () => {
      const p = getConjugatePresence(
        rows(["Bench Press", "Swiss Bar Bench Press", "Incline Bench Press"])
      );
      expect(p.bench.bars).toEqual(new Set(["standard", "swiss"]));
      expect(p.bench.angles).toEqual(new Set(["flat", "incline"]));
    });

    it("does not include bamboo bar if not in data", () => {
      const p = getConjugatePresence(rows(["Bench Press"]));
      expect(p.bench.bars.has("bamboo")).toBe(false);
    });

    it("detects slingshot and pause", () => {
      const p = getConjugatePresence(rows(["Bench Press (Slingshot)", "Bench Press (Command)"]));
      expect(p.bench.hasSlingshot).toBe(true);
      expect(p.bench.hasPause).toBe(true);
    });
  });

  describe("deadlift", () => {
    it("detects reverse bands", () => {
      const p = getConjugatePresence(rows(["Deadlift (Reverse Band)"]));
      expect(p.deadlift.hasReverseBands).toBe(true);
      expect(p.deadlift.hasBands).toBe(false);
    });

    it("detects opposite stance", () => {
      const p = getConjugatePresence(rows(["Opposite Deadlift"]));
      expect(p.deadlift.hasReverseStance).toBe(true);
    });
  });

  it("ignores unrecognized exercise names", () => {
    const p = getConjugatePresence(rows(["Leg Press", "Bicep Curl"]));
    expect(p.squat.bars.size).toBe(0);
    expect(p.bench.bars.size).toBe(0);
    expect(p.deadlift.hasChains).toBe(false);
  });
});
