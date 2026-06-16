import { describe, it, expect } from "vitest";
import {
  pearsonCorrelation,
  computeCorrelationMatrix,
  selectTopCrossLiftVariants,
} from "./correlation";
import type { ConjugateDataPair } from "../types/conjugate";

function session(dateStr: string, e1rm: number) {
  return {
    date: new Date(dateStr),
    sets: 1,
    reps: 1,
    weight: e1rm,
    e1rm,
    unit: "lbs" as const,
  };
}

function pair(
  type: "squat" | "bench" | "deadlift",
  displayName: string,
  dateStr: string,
  e1rm: number
): ConjugateDataPair {
  return [
    { type, bar: "standard", stance: "competition", addlWts: [], equipment: null, displayName },
    session(dateStr, e1rm),
  ];
}

describe("pearsonCorrelation", () => {
  it("returns 1 for perfectly correlated series", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 6, 8, 10];
    expect(pearsonCorrelation(xs, ys)).toBeCloseTo(1.0);
  });

  it("returns -1 for perfectly anti-correlated series", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [10, 8, 6, 4, 2];
    expect(pearsonCorrelation(xs, ys)).toBeCloseTo(-1.0);
  });

  it("returns NaN for constant series", () => {
    expect(pearsonCorrelation([5, 5, 5], [1, 2, 3])).toBeNaN();
  });

  it("returns NaN for fewer than 2 points", () => {
    expect(pearsonCorrelation([1], [1])).toBeNaN();
  });
});

describe("computeCorrelationMatrix", () => {
  const dates = [
    "2024-01-01",
    "2024-02-01",
    "2024-03-01",
    "2024-04-01",
    "2024-05-01",
    "2024-06-01",
  ];

  const pairs: ConjugateDataPair[] = [
    ...dates.map((d, i) => pair("squat", "Comp Squat", d, 300 + i * 10)),
    ...dates.map((d, i) => pair("squat", "SSB Squat", d, 250 + i * 8)),
    ...dates.map((d, i) => pair("squat", "Box Squat", d, 280 - i * 5)),
  ];

  const variants = ["Comp Squat", "SSB Squat", "Box Squat"];

  it("produces a symmetric matrix", () => {
    const matrix = computeCorrelationMatrix(pairs, variants, 2);
    for (let i = 0; i < variants.length; i++) {
      for (let j = 0; j < variants.length; j++) {
        if (isNaN(matrix[i][j])) {
          expect(isNaN(matrix[j][i])).toBe(true);
        } else {
          expect(matrix[i][j]).toBeCloseTo(matrix[j][i]);
        }
      }
    }
  });

  it("has 1.0 on the diagonal", () => {
    const matrix = computeCorrelationMatrix(pairs, variants, 2);
    for (let i = 0; i < variants.length; i++) {
      expect(matrix[i][i]).toBe(1.0);
    }
  });

  it("Comp Squat and SSB Squat are highly correlated (both trend up)", () => {
    const matrix = computeCorrelationMatrix(pairs, variants, 2);
    const r = matrix[0][1];
    expect(isNaN(r)).toBe(false);
    expect(r).toBeGreaterThan(0.9);
  });

  it("Comp Squat and Box Squat are anti-correlated (one up, other down)", () => {
    const matrix = computeCorrelationMatrix(pairs, variants, 2);
    const r = matrix[0][2];
    expect(isNaN(r)).toBe(false);
    expect(r).toBeLessThan(-0.9);
  });

  it("returns NaN for pairs with insufficient overlap", () => {
    const sparseCompSq: ConjugateDataPair[] = [pair("squat", "Comp Squat", "2024-01-01", 300)];
    const sparseSSB: ConjugateDataPair[] = [pair("squat", "SSB Squat", "2024-01-01", 250)];
    const matrix = computeCorrelationMatrix(
      [...sparseCompSq, ...sparseSSB],
      ["Comp Squat", "SSB Squat"],
      5
    );
    expect(isNaN(matrix[0][1])).toBe(true);
  });
});

describe("selectTopCrossLiftVariants", () => {
  const sqDates = [
    "2024-01-01",
    "2024-02-01",
    "2024-03-01",
    "2024-04-01",
    "2024-05-01",
    "2024-06-01",
  ];
  const bpDates = [
    "2024-01-15",
    "2024-02-15",
    "2024-03-15",
    "2024-04-15",
    "2024-05-15",
    "2024-06-15",
  ];

  const pairs: ConjugateDataPair[] = [
    ...sqDates.map((d, i) => pair("squat", "Comp Squat", d, 300 + i * 10)),
    ...sqDates.map((d, i) => pair("squat", "SSB Squat", d, 250 + i * 10)),
    ...sqDates.map((d, i) => pair("squat", "Box Squat", d, 260 + i * 10)),
    ...sqDates.map((d, i) => pair("squat", "Front Squat", d, 200 + i * 10)),
    ...bpDates.map((d, i) => pair("bench", "Comp Bench", d, 200 + i * 8)),
    ...bpDates.map((d, i) => pair("bench", "Close Grip", d, 180 + i * 8)),
    ...sqDates.map((d, i) => pair("deadlift", "Comp Deadlift", d, 350 + i * 12)),
    ...sqDates.map((d, i) => pair("deadlift", "Sumo DL", d, 320 + i * 12)),
  ];

  it("always includes the baseline exercises", () => {
    const { squat, bench, deadlift } = selectTopCrossLiftVariants(
      pairs,
      ["Comp Squat", "SSB Squat", "Box Squat", "Front Squat"],
      ["Comp Bench", "Close Grip"],
      ["Comp Deadlift", "Sumo DL"],
      "Comp Squat",
      "Comp Bench",
      "Comp Deadlift",
      2
    );
    expect(squat).toContain("Comp Squat");
    expect(bench).toContain("Comp Bench");
    expect(deadlift).toContain("Comp Deadlift");
  });

  it("respects the topPerLift limit", () => {
    const { squat, bench, deadlift } = selectTopCrossLiftVariants(
      pairs,
      ["Comp Squat", "SSB Squat", "Box Squat", "Front Squat"],
      ["Comp Bench", "Close Grip"],
      ["Comp Deadlift", "Sumo DL"],
      "Comp Squat",
      "Comp Bench",
      "Comp Deadlift",
      2
    );
    expect(squat.length).toBeLessThanOrEqual(2);
    expect(bench.length).toBeLessThanOrEqual(2);
    expect(deadlift.length).toBeLessThanOrEqual(2);
  });
});
