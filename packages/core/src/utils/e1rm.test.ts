import { describe, it, expect } from "vitest";
import { calcE1RM, predictE1RM, fitAddlWtOffset, fitVariantFactor } from "./e1rm";
import type { TrainingSession } from "../types/conjugate";

const d = (dateStr: string) => new Date(dateStr);

// Constructs a minimal TrainingSession for predictE1RM tests where only date and e1rm matter.
const s = (dateStr: string, e1rm: number): TrainingSession => ({
  date: d(dateStr),
  sets: 1,
  reps: 1,
  weight: e1rm,
  e1rm,
  unit: "lbs",
});

const w = (dateStr: string, weight: number, reps: number): TrainingSession => ({
  date: d(dateStr),
  sets: 1,
  reps,
  weight,
  e1rm: calcE1RM(weight, reps),
  unit: "lbs",
});

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
  it("returns null for an empty array", () => {
    expect(predictE1RM([], d("2024-01-01"))).toBeNull();
  });

  it("returns the single session e1RM for any date", () => {
    const sessions = [s("2024-01-10", 200)];
    expect(predictE1RM(sessions, d("2024-01-01"))).toBe(200);
    expect(predictE1RM(sessions, d("2024-01-10"))).toBe(200);
    expect(predictE1RM(sessions, d("2024-01-20"))).toBe(200);
  });

  it("interpolates the midpoint between two sessions", () => {
    // 100 on Monday, 110 on Friday → 105 on Wednesday
    const sessions = [
      s("2024-01-01", 100), // Monday
      s("2024-01-05", 110), // Friday
    ];
    expect(predictE1RM(sessions, d("2024-01-03"))).toBeCloseTo(105, 1);
  });

  it("extrapolates forward at the rate of the last two sessions", () => {
    // 100 on Monday, 110 on Friday → 115 on Sunday
    const sessions = [
      s("2024-01-01", 100), // Monday
      s("2024-01-05", 110), // Friday
    ];
    expect(predictE1RM(sessions, d("2024-01-07"))).toBeCloseTo(115, 1);
  });

  it("extrapolates backward at the rate of the first two sessions", () => {
    // 100 on Jan 10, 120 on Jan 20 → +2/day. Jan 5 (5 days before first) → 90
    const sessions = [s("2024-01-10", 100), s("2024-01-20", 120)];
    expect(predictE1RM(sessions, d("2024-01-05"))).toBeCloseTo(90, 1);
  });

  it("clamps backward extrapolation to 0", () => {
    // 50 on Jan 10, 100 on Jan 20 → +5/day backward → goes negative far enough back
    const sessions = [s("2024-01-10", 50), s("2024-01-20", 100)];
    // Jan 1 (9 days before first): 50 + 5 * (-9) = 5
    expect(predictE1RM(sessions, d("2024-01-01"))).toBeCloseTo(5, 1);
    // Dec 28 (13 days before first): 50 + 5 * (-13) = -15 → clamped to 0
    expect(predictE1RM(sessions, d("2023-12-28"))).toBe(0);
  });

  it("clamps forward extrapolation to 0", () => {
    // 10 on Jan 1, 0 on Jan 10 → -1/day. Jan 20 → -10 → clamped to 0
    const sessions = [s("2024-01-01", 10), s("2024-01-11", 0)];
    expect(predictE1RM(sessions, d("2024-01-21"))).toBe(0);
  });

  it("returns exact e1RM when target is on a session date", () => {
    const sessions = [s("2024-01-01", 100), s("2024-01-10", 110)];
    expect(predictE1RM(sessions, d("2024-01-01"))).toBe(100);
    expect(predictE1RM(sessions, d("2024-01-10"))).toBe(110);
  });

  it("handles sessions in any insertion order", () => {
    const sessions = [s("2024-01-05", 110), s("2024-01-01", 100)];
    expect(predictE1RM(sessions, d("2024-01-03"))).toBeCloseTo(105, 1);
  });

  it("extrapolates downward when the last rate is negative", () => {
    // 110 on Monday, 100 on Friday → 95 on Sunday
    const sessions = [s("2024-01-01", 110), s("2024-01-05", 100)];
    expect(predictE1RM(sessions, d("2024-01-07"))).toBeCloseTo(95, 1);
  });

  it("uses only the last two sessions for extrapolation rate", () => {
    // First two sessions gained fast; last two gained slowly
    // Extrapolation should follow the slow rate
    const sessions = [
      s("2024-01-01", 100),
      s("2024-01-02", 120), // +20 in 1 day
      s("2024-01-10", 130), // +10 in 8 days → ~1.25/day
    ];
    // 2 days after last session: 130 + 1.25 * 2 ≈ 132.5
    expect(predictE1RM(sessions, d("2024-01-12"))).toBeCloseTo(132.5, 1);
  });

  it("uses the best e1RM when multiple sessions fall on the same date", () => {
    const sessions = [
      s("2024-01-01", 100),
      s("2024-01-01", 120), // higher e1rm on the same date
      s("2024-01-10", 130),
    ];
    expect(predictE1RM(sessions, d("2024-01-01"))).toBe(120);
  });
});

describe("fitVariantFactor", () => {
  it("returns sampleCount 0 when baseline sessions are empty", () => {
    expect(fitVariantFactor([], [w("2024-01-10", 180, 1)])).toEqual({ factor: 0, sampleCount: 0 });
  });

  it("returns sampleCount 0 when variant sessions are empty", () => {
    expect(fitVariantFactor([s("2024-01-01", 200)], [])).toEqual({ factor: 0, sampleCount: 0 });
  });

  it("computes the factor from a single-rep variant session", () => {
    // Baseline e1RM constant at 200. Variant: 180 × 1 → e1RM = 180.
    // factor = 180 / 200 = 0.90
    const baseline = [s("2024-01-01", 200), s("2024-01-10", 200)];
    const result = fitVariantFactor(baseline, [w("2024-01-05", 180, 1)]);
    expect(result.sampleCount).toBe(1);
    expect(result.factor).toBeCloseTo(0.9, 2);
  });

  it("computes the factor from a multi-rep variant session", () => {
    // Baseline e1RM constant at 200. Variant: 150 × 5 → e1RM = 150 * (1 + 5/30) = 175.
    // factor = 175 / 200 = 0.875
    const baseline = [s("2024-01-01", 200), s("2024-01-10", 200)];
    const result = fitVariantFactor(baseline, [w("2024-01-05", 150, 5)]);
    expect(result.sampleCount).toBe(1);
    expect(result.factor).toBeCloseTo(0.875, 3);
  });

  it("averages the factor across multiple variant sessions", () => {
    // Baseline constant at 200. Both sessions yield factor 0.90.
    const baseline = [s("2024-01-01", 200), s("2024-01-20", 200)];
    const variant = [w("2024-01-05", 180, 1), w("2024-01-15", 180, 1)];
    const result = fitVariantFactor(baseline, variant);
    expect(result.sampleCount).toBe(2);
    expect(result.factor).toBeCloseTo(0.9, 2);
  });

  it("includes single-rep and multi-rep sessions together", () => {
    // 1-rep: factor = 180/200 = 0.90
    // 5-rep: factor = 175/200 = 0.875
    // mean = 0.8875
    const baseline = [s("2024-01-01", 200), s("2024-01-10", 200)];
    const variant = [w("2024-01-05", 180, 1), w("2024-01-07", 150, 5)];
    const result = fitVariantFactor(baseline, variant);
    expect(result.sampleCount).toBe(2);
    expect(result.factor).toBeCloseTo(0.8875, 3);
  });
});

describe("fitAddlWtOffset", () => {
  it("returns sampleCount 0 when straight sessions are empty", () => {
    expect(fitAddlWtOffset([], [w("2024-01-10", 220, 5)])).toEqual({ offset: 0, sampleCount: 0 });
  });

  it("returns sampleCount 0 when chain sessions are empty", () => {
    expect(fitAddlWtOffset([s("2024-01-01", 200)], [])).toEqual({ offset: 0, sampleCount: 0 });
  });

  it("computes the offset from a single-rep chain session", () => {
    // For reps=1, calcE1RM returns weight unchanged, so effectiveWeight = predicted directly.
    // Straight e1rm is constant at 200. Chain session: 220 lbs × 1 rep.
    // effectiveWeight = 200, offset = 200 - 220 = -20 lbs
    const straight = [s("2024-01-01", 200), s("2024-01-10", 200)];
    const result = fitAddlWtOffset(straight, [w("2024-01-05", 220, 1)]);
    expect(result.sampleCount).toBe(1);
    expect(result.offset).toBeCloseTo(-20, 1);
  });

  it("computes the offset from a multi-rep chain session", () => {
    // Straight e1rm is constant at 200 lbs.
    // Chain session: 220 lbs × 5 reps.
    // effectiveWeight = 200 / (1 + 5/30) ≈ 171.43 lbs
    // offset = 171.43 - 220 ≈ -48.57 lbs
    const straight = [s("2024-01-01", 200), s("2024-01-10", 200)];
    const result = fitAddlWtOffset(straight, [w("2024-01-05", 220, 5)]);
    expect(result.sampleCount).toBe(1);
    expect(result.offset).toBeCloseTo(-48.57, 1);
  });

  it("averages the offset across multiple chain sessions", () => {
    // Straight e1rm is constant at 200, so both chain sessions yield the same offset.
    const straight = [s("2024-01-01", 200), s("2024-01-20", 200)];
    const chain = [w("2024-01-05", 220, 5), w("2024-01-15", 220, 5)];
    const result = fitAddlWtOffset(straight, chain);
    expect(result.sampleCount).toBe(2);
    expect(result.offset).toBeCloseTo(-48.57, 1);
  });

  it("includes single-rep sessions alongside multi-rep ones", () => {
    // 1-rep: effectiveWeight = 200, offset = 200 - 220 = -20
    // 5-rep: effectiveWeight ≈ 171.43, offset ≈ -48.57
    // mean ≈ -34.28
    const straight = [s("2024-01-01", 200), s("2024-01-10", 200)];
    const chain = [w("2024-01-05", 220, 1), w("2024-01-07", 220, 5)];
    const result = fitAddlWtOffset(straight, chain);
    expect(result.sampleCount).toBe(2);
    expect(result.offset).toBeCloseTo(-34.28, 1);
  });
});
