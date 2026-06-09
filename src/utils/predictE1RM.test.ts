import { describe, it, expect } from "vitest";
import { predictE1RM } from "./predictE1RM";

const d = (dateStr: string) => new Date(dateStr);

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

  it("clamps to the first session for dates before the first session", () => {
    const sessions = new Map([
      ["2024-01-10", 100],
      ["2024-01-20", 120],
    ]);
    expect(predictE1RM(sessions, d("2024-01-01"))).toBe(100);
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
