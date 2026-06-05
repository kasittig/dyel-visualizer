import { describe, it, expect } from "vitest";
import { calcVolume } from "./calcVolume";

describe("calcVolume", () => {
  it("returns weight × reps for a typical set", () => {
    expect(calcVolume(100, 5)).toBe(500);
  });

  it("returns 0 when weight is 0", () => {
    expect(calcVolume(0, 10)).toBe(0);
  });

  it("returns 0 when reps is 0", () => {
    expect(calcVolume(135, 0)).toBe(0);
  });

  it("scales linearly with weight", () => {
    expect(calcVolume(200, 5)).toBe(calcVolume(100, 5) * 2);
  });

  it("scales linearly with reps", () => {
    expect(calcVolume(100, 10)).toBe(calcVolume(100, 5) * 2);
  });
});
