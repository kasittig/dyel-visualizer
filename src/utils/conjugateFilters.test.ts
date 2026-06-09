import { describe, expect, it } from "vitest";
import { getBenchPresence, getDeadliftPresence, getSquatPresence } from "./conjugateFilters";
import { parseConjugateRows } from "./parseConjugate";
import type { SheetRow } from "../hooks/useSheetData";

function rows(exercises: string[]): ReturnType<typeof parseConjugateRows> {
  return parseConjugateRows(exercises.map((exercise) => ({ exercise }) as SheetRow));
}

describe("getSquatPresence", () => {
  it("returns empty presence for no rows", () => {
    const p = getSquatPresence([]);
    expect(p.bars.size).toBe(0);
    expect(p.hasChains).toBe(false);
  });

  it("tracks bars present in data", () => {
    const p = getSquatPresence(rows(["Squat", "Squat (SSB)"]));
    expect(p.bars).toEqual(new Set(["standard", "ssb"]));
  });

  it("does not include bars not in data", () => {
    const p = getSquatPresence(rows(["Squat"]));
    expect(p.bars).toEqual(new Set(["standard"]));
    expect(p.bars.has("ssb")).toBe(false);
  });

  it("detects box squat", () => {
    const p = getSquatPresence(rows(["Squat"]));
    expect(p.hasBox).toBe(false);
    const p2 = getSquatPresence(rows(["Box Squat"]));
    expect(p2.hasBox).toBe(true);
  });

  it("detects chains and bands", () => {
    const p = getSquatPresence(rows(["Squat (Chains)", "Box Squat (Bands)"]));
    expect(p.hasChains).toBe(true);
    expect(p.hasBands).toBe(true);
  });
});

describe("getBenchPresence", () => {
  it("returns empty presence for no rows", () => {
    const p = getBenchPresence([]);
    expect(p.bars.size).toBe(0);
    expect(p.hasChains).toBe(false);
  });

  it("tracks bars and angles present in data", () => {
    const p = getBenchPresence(
      rows(["Bench Press", "Swiss Bar Bench Press", "Incline Bench Press"])
    );
    expect(p.bars).toEqual(new Set(["standard", "swiss"]));
    expect(p.angles).toEqual(new Set(["flat", "incline"]));
  });

  it("does not include bamboo bar if not in data", () => {
    const p = getBenchPresence(rows(["Bench Press"]));
    expect(p.bars.has("bamboo")).toBe(false);
  });

  it("detects slingshot and pause", () => {
    const p = getBenchPresence(rows(["Bench Press (Slingshot)", "Bench Press (Command)"]));
    expect(p.hasSlingshot).toBe(true);
    expect(p.hasPause).toBe(true);
  });
});

describe("getDeadliftPresence", () => {
  it("returns empty presence for no rows", () => {
    const p = getDeadliftPresence([]);
    expect(p.hasChains).toBe(false);
  });

  it("detects reverse bands", () => {
    const p = getDeadliftPresence(rows(["Deadlift (Reverse Band)"]));
    expect(p.hasReverseBands).toBe(true);
    expect(p.hasBands).toBe(false);
  });

  it("detects opposite stance", () => {
    const p = getDeadliftPresence(rows(["Opposite Deadlift"]));
    expect(p.hasReverseStance).toBe(true);
  });
});

it("ignores unrecognized exercise names", () => {
  const p1 = getSquatPresence(rows(["Leg Press", "Bicep Curl"]));
  expect(p1.bars.size).toBe(0);
  const p2 = getBenchPresence(rows(["Leg Press", "Bicep Curl"]));
  expect(p2.bars.size).toBe(0);
  const p3 = getDeadliftPresence(rows(["Leg Press", "Bicep Curl"]));
  expect(p3.hasChains).toBe(false);
});
