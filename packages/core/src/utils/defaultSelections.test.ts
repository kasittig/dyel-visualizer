import { describe, it, expect } from "vitest";
import { defaultBaselineName, defaultTargetName } from "./defaultSelections";
import type { ConjugateDataPair } from "../types/conjugate";

function pair(
  displayName: string,
  date: string,
  e1rm: number,
  opts: Partial<{
    bar: ConjugateDataPair[0]["bar"];
    stance: ConjugateDataPair[0]["stance"];
    equipment: ConjugateDataPair[0]["equipment"];
    addlWts: ConjugateDataPair[0]["addlWts"];
  }> = {}
): ConjugateDataPair {
  return [
    {
      displayName,
      type: "squat",
      bar: opts.bar ?? "standard",
      stance: opts.stance ?? "competition",
      addlWts: opts.addlWts ?? [],
      equipment: opts.equipment ?? null,
      movementCategory: "anchor",
    },
    { date: new Date(date), sets: 1, reps: 1, weight: 100, e1rm, unit: "lbs" },
  ];
}

describe("defaultBaselineName", () => {
  it("returns null for empty input", () => {
    expect(defaultBaselineName([])).toBeNull();
  });

  it("returns the only exercise for a single entry", () => {
    expect(defaultBaselineName([pair("Squat", "2024-01-01", 300)])).toBe("Squat");
  });

  it("returns the most recently trained exercise", () => {
    const rows = [pair("Squat", "2024-01-01", 300), pair("Bench", "2024-02-01", 200)];
    expect(defaultBaselineName(rows)).toBe("Bench");
  });

  it("breaks ties by highest e1RM on the same date", () => {
    const rows = [pair("Squat", "2024-02-01", 300), pair("Bench", "2024-02-01", 350)];
    expect(defaultBaselineName(rows)).toBe("Bench");
  });

  it("uses the highest e1RM session when multiple sessions exist for same exercise on same date", () => {
    const rows = [
      pair("Squat", "2024-02-01", 300),
      pair("Squat", "2024-02-01", 350),
      pair("Bench", "2024-02-01", 340),
    ];
    // Squat's best on that day is 350 > Bench's 340
    expect(defaultBaselineName(rows)).toBe("Squat");
  });

  it("tracks last date per exercise, not global last date", () => {
    const rows = [
      pair("Squat", "2024-02-01", 300),
      pair("Bench", "2024-01-01", 200),
      pair("Squat", "2024-01-15", 280),
    ];
    // Squat's last date is 2024-02-01; Bench's is 2024-01-01
    expect(defaultBaselineName(rows)).toBe("Squat");
  });
});

describe("defaultTargetName", () => {
  it("returns null for empty input", () => {
    expect(defaultTargetName([])).toBeNull();
  });

  it("returns the first competition/standard/no-equipment/no-addlWt exercise", () => {
    const rows = [
      pair("SSB Squat", "2024-01-01", 300, { bar: "ssb" }),
      pair("Squat", "2024-01-01", 280),
    ];
    expect(defaultTargetName(rows)).toBe("Squat");
  });

  it("falls back to the first exercise when no match", () => {
    const rows = [
      pair("SSB Squat", "2024-01-01", 300, { bar: "ssb" }),
      pair("Cambered Squat", "2024-01-01", 280, { bar: "cambered" }),
    ];
    expect(defaultTargetName(rows)).toBe("SSB Squat");
  });

  it("deduplicates by displayName — only considers each exercise once", () => {
    const rows = [
      pair("SSB Squat", "2024-01-01", 300, { bar: "ssb" }),
      pair("Squat", "2024-01-01", 280),
      pair("Squat", "2024-02-01", 290),
    ];
    expect(defaultTargetName(rows)).toBe("Squat");
  });

  it("excludes exercises with equipment", () => {
    const rows = [
      pair("Box Squat", "2024-01-01", 300, { equipment: "box" }),
      pair("Squat", "2024-01-01", 280),
    ];
    expect(defaultTargetName(rows)).toBe("Squat");
  });

  it("excludes exercises with addlWts", () => {
    const rows = [
      pair("Band Squat", "2024-01-01", 300, { addlWts: ["bands"] }),
      pair("Squat", "2024-01-01", 280),
    ];
    expect(defaultTargetName(rows)).toBe("Squat");
  });
});
