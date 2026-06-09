import { describe, it, expect } from "vitest";
import { calcE1RM } from "./calcE1RM";

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
