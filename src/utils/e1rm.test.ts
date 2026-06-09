import { describe, it, expect } from "vitest";
import { calcE1RM, predictE1RM } from "./e1rm";

const d = (dateStr: string) => new Date(dateStr);

describe("calcE1RM", () => {
  it("returns weight unchanged for a single rep", () => {
    expect(calcE1RM(100, 1)).toBe(100);
  });

  it("applies the Epley formula for typical rep counts", () => {
    expect(calcE1RM(100, 10)).toBeCloseTo(133.33, 1);
  });

  it("scales linearly with weight", () => {
    expect(calcE1RM(200, 5)).toBeCloseTo(calcE1RM(100, 5) * 2);
  });

  it("increases with more reps at the same weight", () => {
    expect(calcE1RM(100, 10)).toBeGreaterThan(calcE1RM(100, 5));
  });

  it("returns 0 when weight is 0", () => {
    expect(calcE1RM(0, 10)).toBe(0);
  });
});

describe("predictE1RM", () => {
  it("returns null for an empty map", () => {
    expect(predictE1RM(new Map(), d("2024-01-01"))).toBeNull();
  });

  it("returns the single session e1RM for any date", () => {
    const sessions = new Map([["2024-01-10", 200]]);
    expect(predictE1RM(sessions, d("2024-01-01"))).toBe(200);
    expect(predictE1RM(sessions, d("2024-01-10"))).toBe(200);
    expect(predictE1RM(sessions, d("2024-01-20"))).toBe(200);
  });

  it("interpolates the midpoint between two sessions", () => {
    // 100 on Monday, 110 on Friday → 105 on Wednesday
    const sessions = new Map([
      ["2024-01-01", 100], // Monday
      ["2024-01-05", 110], // Friday
    ]);
    expect(predictE1RM(sessions, d("2024-01-03"))).toBeCloseTo(105, 1);
  });

  it("extrapolates forward at the rate of the last two sessions", () => {
    // 100 on Monday, 110 on Friday → 115 on Sunday
    const sessions = new Map([
      ["2024-01-01", 100], // Monday
      ["2024-01-05", 110], // Friday
    ]);
    expect(predictE1RM(sessions, d("2024-01-07"))).toBeCloseTo(115, 1);
  });

  it("extrapolates backward at the rate of the first two sessions", () => {
    // 100 on Jan 10, 120 on Jan 20 → +2/day. Jan 5 (5 days before first) → 90
    const sessions = new Map([
      ["2024-01-10", 100],
      ["2024-01-20", 120],
    ]);
    expect(predictE1RM(sessions, d("2024-01-05"))).toBeCloseTo(90, 1);
  });

  it("clamps backward extrapolation to 0", () => {
    // 50 on Jan 10, 100 on Jan 20 → +5/day backward → goes negative far enough back
    const sessions = new Map([
      ["2024-01-10", 50],
      ["2024-01-20", 100],
    ]);
    // Jan 1 (9 days before first): 50 + 5 * (-9) = 5
    expect(predictE1RM(sessions, d("2024-01-01"))).toBeCloseTo(5, 1);
    // Dec 28 (13 days before first): 50 + 5 * (-13) = -15 → clamped to 0
    expect(predictE1RM(sessions, d("2023-12-28"))).toBe(0);
  });

  it("clamps forward extrapolation to 0", () => {
    // 10 on Jan 1, 0 on Jan 10 → -1/day. Jan 20 → -10 → clamped to 0
    const sessions = new Map([
      ["2024-01-01", 10],
      ["2024-01-11", 0],
    ]);
    expect(predictE1RM(sessions, d("2024-01-21"))).toBe(0);
  });

  it("returns exact e1RM when target is on a session date", () => {
    const sessions = new Map([
      ["2024-01-01", 100],
      ["2024-01-10", 110],
    ]);
    expect(predictE1RM(sessions, d("2024-01-01"))).toBe(100);
    expect(predictE1RM(sessions, d("2024-01-10"))).toBe(110);
  });

  it("handles map entries in any insertion order", () => {
    const sessions = new Map([
      ["2024-01-05", 110],
      ["2024-01-01", 100],
    ]);
    expect(predictE1RM(sessions, d("2024-01-03"))).toBeCloseTo(105, 1);
  });

  it("extrapolates downward when the last rate is negative", () => {
    // 110 on Monday, 100 on Friday → 95 on Sunday
    const sessions = new Map([
      ["2024-01-01", 110],
      ["2024-01-05", 100],
    ]);
    expect(predictE1RM(sessions, d("2024-01-07"))).toBeCloseTo(95, 1);
  });

  it("uses only the last two sessions for extrapolation rate", () => {
    // First two sessions gained fast; last two gained slowly
    // Extrapolation should follow the slow rate
    const sessions = new Map([
      ["2024-01-01", 100],
      ["2024-01-02", 120], // +20 in 1 day
      ["2024-01-10", 130], // +10 in 8 days → ~1.25/day
    ]);
    // 2 days after last session: 130 + 1.25 * 2 ≈ 132.5
    expect(predictE1RM(sessions, d("2024-01-12"))).toBeCloseTo(132.5, 1);
  });
});
