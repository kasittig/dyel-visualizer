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

// Weekly sessions with genuine week-to-week variation so first differences
// have non-zero variance (pure linear progressions would give NaN after
// differencing because variance = 0).
const WEEKLY_DATES = [
  "2024-01-01",
  "2024-01-08",
  "2024-01-15",
  "2024-01-22",
  "2024-01-29",
  "2024-02-05",
  "2024-02-12",
  "2024-02-19",
  "2024-02-26",
  "2024-03-04",
  "2024-03-11",
  "2024-03-18",
];

// Comp Squat: general uptrend with weekly variation
const COMP_SQ = [300, 308, 305, 315, 312, 322, 318, 328, 325, 335, 330, 340];
// SSB Squat: mirrors Comp Squat's ups/downs (correlated)
const SSB_SQ = [250, 257, 254, 263, 260, 269, 265, 274, 271, 280, 276, 285];
// Box Squat: opposite weekly swings (anti-correlated)
const BOX_SQ = [280, 273, 276, 267, 270, 261, 265, 256, 259, 250, 254, 245];

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
  const pairs: ConjugateDataPair[] = [
    ...WEEKLY_DATES.map((d, i) => pair("squat", "Comp Squat", d, COMP_SQ[i])),
    ...WEEKLY_DATES.map((d, i) => pair("squat", "SSB Squat", d, SSB_SQ[i])),
    ...WEEKLY_DATES.map((d, i) => pair("squat", "Box Squat", d, BOX_SQ[i])),
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

  it("Comp Squat and SSB Squat are highly correlated (same weekly pattern)", () => {
    const matrix = computeCorrelationMatrix(pairs, variants, 2);
    const r = matrix[0][1];
    expect(isNaN(r)).toBe(false);
    expect(r).toBeGreaterThan(0.8);
  });

  it("Comp Squat and Box Squat are anti-correlated (opposite weekly pattern)", () => {
    const matrix = computeCorrelationMatrix(pairs, variants, 2);
    const r = matrix[0][2];
    expect(isNaN(r)).toBe(false);
    expect(r).toBeLessThan(-0.8);
  });

  it("returns NaN for pairs with insufficient overlap", () => {
    const sparse: ConjugateDataPair[] = [
      pair("squat", "Comp Squat", "2024-01-01", 300),
      pair("squat", "SSB Squat", "2024-01-01", 250),
    ];
    const matrix = computeCorrelationMatrix(sparse, ["Comp Squat", "SSB Squat"], 5);
    expect(isNaN(matrix[0][1])).toBe(true);
  });

  it("returns NaN for non-overlapping training windows", () => {
    const noOverlap: ConjugateDataPair[] = [
      pair("squat", "Comp Squat", "2024-01-01", 300),
      pair("squat", "Comp Squat", "2024-02-01", 310),
      pair("squat", "SSB Squat", "2024-06-01", 250),
      pair("squat", "SSB Squat", "2024-07-01", 260),
    ];
    const matrix = computeCorrelationMatrix(noOverlap, ["Comp Squat", "SSB Squat"], 2);
    expect(isNaN(matrix[0][1])).toBe(true);
  });
});

describe("selectTopCrossLiftVariants", () => {
  const bpDates = WEEKLY_DATES.map((d) => {
    // Offset bench dates by 3 days so windows overlap but aren't identical
    const dt = new Date(d);
    dt.setDate(dt.getDate() + 3);
    return dt.toISOString().slice(0, 10);
  });

  const pairs: ConjugateDataPair[] = [
    ...WEEKLY_DATES.map((d, i) => pair("squat", "Comp Squat", d, COMP_SQ[i])),
    ...WEEKLY_DATES.map((d, i) => pair("squat", "SSB Squat", d, SSB_SQ[i])),
    ...WEEKLY_DATES.map((d, i) => pair("squat", "Box Squat", d, BOX_SQ[i])),
    ...WEEKLY_DATES.map((d, i) => pair("squat", "Front Squat", d, BOX_SQ[i])),
    ...bpDates.map((d, i) => pair("bench", "Comp Bench", d, COMP_SQ[i])),
    ...bpDates.map((d, i) => pair("bench", "Close Grip", d, SSB_SQ[i])),
    ...WEEKLY_DATES.map((d, i) => pair("deadlift", "Comp Deadlift", d, COMP_SQ[i])),
    ...WEEKLY_DATES.map((d, i) => pair("deadlift", "Sumo DL", d, SSB_SQ[i])),
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
