import { describe, it, expect } from "vitest";
import { calcNormalizedE1RM } from "./calcNormalizedE1RM";
import { calcE1RM } from "./calcE1RM";
import { parseConjugateLift } from "./parseConjugate";

const OFFSETS = { chains: 60, bands: 80, reverseBands: 50 };

describe("calcNormalizedE1RM", () => {
  it("matches calcE1RM when there is no accommodating resistance", () => {
    const lift = parseConjugateLift("Bench")!;
    expect(calcNormalizedE1RM(300, 3, lift, OFFSETS)).toBeCloseTo(calcE1RM(300, 3));
  });

  it("adds chain offset to bar weight before computing e1RM", () => {
    const lift = parseConjugateLift("Bench (Chains)")!;
    expect(calcNormalizedE1RM(225, 3, lift, OFFSETS)).toBeCloseTo(calcE1RM(225 + 60, 3));
  });

  it("adds band offset to bar weight before computing e1RM", () => {
    const lift = parseConjugateLift("Bench (Bands)")!;
    expect(calcNormalizedE1RM(200, 5, lift, OFFSETS)).toBeCloseTo(calcE1RM(200 + 80, 5));
  });

  it("subtracts reverse band offset from bar weight", () => {
    const lift = parseConjugateLift("Deadlift (Reverse Bands)")!;
    expect(calcNormalizedE1RM(450, 3, lift, OFFSETS)).toBeCloseTo(calcE1RM(450 - 50, 3));
  });

  it("combines chain and band offsets when both are present", () => {
    const lift = parseConjugateLift("Bench (Chains, Bands)")!;
    expect(calcNormalizedE1RM(200, 3, lift, OFFSETS)).toBeCloseTo(calcE1RM(200 + 60 + 80, 3));
  });

  it("floors effective weight at 0 rather than going negative", () => {
    const lift = parseConjugateLift("Deadlift (Reverse Bands)")!;
    // bar weight of 10 with a 50 lb reverse band offset would be negative without the floor
    const result = calcNormalizedE1RM(10, 3, lift, OFFSETS);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("does not apply reverse band offset to squat or bench", () => {
    const squat = parseConjugateLift("Squat")!;
    const bench = parseConjugateLift("Bench")!;
    expect(calcNormalizedE1RM(300, 3, squat, OFFSETS)).toBeCloseTo(calcE1RM(300, 3));
    expect(calcNormalizedE1RM(300, 3, bench, OFFSETS)).toBeCloseTo(calcE1RM(300, 3));
  });
});
