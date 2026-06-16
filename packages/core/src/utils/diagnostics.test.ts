import { describe, it, expect, afterEach } from "vitest";
import {
  toMovementCategory,
  BIOMECHANICAL_BASELINES,
  ACCOMMODATING_RESISTANCE_BASELINES,
  generateDiagnostics,
} from "./diagnostics";
import { calcE1RM } from "./e1rm";
import type { ConjugateDataPair, ConjugateExercise, TrainingSession } from "../types/conjugate";

function ex(overrides: Partial<ConjugateExercise> = {}): ConjugateExercise {
  return {
    type: "squat",
    bar: "standard",
    stance: "competition",
    addlWts: [],
    equipment: null,
    displayName: "squat",
    movementCategory: "anchor",
    ...overrides,
  };
}

describe("toMovementCategory", () => {
  it('competition stance → "anchor"', () => {
    expect(toMovementCategory(ex({ stance: "competition" }))).toBe("anchor");
  });

  it('board equipment → "lockout"', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: "board" }))).toBe("lockout");
  });

  it('floor equipment → "lockout"', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: "floor" }))).toBe("lockout");
  });

  it('blocks equipment → "lockout"', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: "blocks" }))).toBe("lockout");
  });

  it('rack equipment → "lockout"', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: "rack" }))).toBe("lockout");
  });

  it('close stance → "lockout"', () => {
    expect(toMovementCategory(ex({ stance: "close" }))).toBe("lockout");
  });

  it('deficit equipment → "bottom_range"', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: "deficit" }))).toBe("bottom_range");
  });

  it('pause equipment → "bottom_range"', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: "pause" }))).toBe("bottom_range");
  });

  it('squat + ssb bar → "quad_dominant"', () => {
    expect(toMovementCategory(ex({ type: "squat", stance: null, bar: "ssb" }))).toBe(
      "quad_dominant"
    );
  });

  it('squat + goblet bar → "quad_dominant"', () => {
    expect(toMovementCategory(ex({ type: "squat", stance: null, bar: "goblet" }))).toBe(
      "quad_dominant"
    );
  });

  it('squat + trap bar → "quad_dominant"', () => {
    expect(toMovementCategory(ex({ type: "squat", stance: null, bar: "trap" }))).toBe(
      "quad_dominant"
    );
  });

  it('squat + front stance → "quad_dominant"', () => {
    expect(toMovementCategory(ex({ type: "squat", stance: "front" }))).toBe("quad_dominant");
  });

  it('deadlift + romanian stance → "posterior_chain"', () => {
    expect(toMovementCategory(ex({ type: "deadlift", stance: "romanian", equipment: null }))).toBe(
      "posterior_chain"
    );
  });

  it('squat + box equipment → "bottom_range"', () => {
    expect(toMovementCategory(ex({ type: "squat", stance: null, equipment: "box" }))).toBe(
      "bottom_range"
    );
  });

  it('slingshot stance → "lockout"', () => {
    expect(toMovementCategory(ex({ type: "bench", stance: "slingshot" }))).toBe("lockout");
  });

  it('builder stance → "lockout"', () => {
    expect(toMovementCategory(ex({ type: "bench", stance: "builder" }))).toBe("lockout");
  });

  it('narrow stance → "lockout"', () => {
    expect(toMovementCategory(ex({ type: "bench", stance: "narrow" }))).toBe("lockout");
  });

  it('bench + incline equipment → "lockout"', () => {
    expect(toMovementCategory(ex({ type: "bench", stance: null, equipment: "incline" }))).toBe(
      "lockout"
    );
  });

  it('bench + decline equipment → "lockout"', () => {
    expect(toMovementCategory(ex({ type: "bench", stance: null, equipment: "decline" }))).toBe(
      "lockout"
    );
  });

  it('deadlift + sumo stance → "posterior_chain"', () => {
    expect(toMovementCategory(ex({ type: "deadlift", stance: "sumo", equipment: null }))).toBe(
      "posterior_chain"
    );
  });

  it('deadlift + conventional stance → "quad_dominant"', () => {
    expect(
      toMovementCategory(ex({ type: "deadlift", stance: "conventional", equipment: null }))
    ).toBe("quad_dominant");
  });

  it('bench with no matching rule → "unclassified"', () => {
    expect(toMovementCategory(ex({ type: "bench", stance: null, equipment: null }))).toBe(
      "unclassified"
    );
  });

  it("competition stance beats board equipment (priority check)", () => {
    expect(toMovementCategory(ex({ stance: "competition", equipment: "board" }))).toBe("anchor");
  });

  it("competition stance beats incline equipment (priority check)", () => {
    expect(
      toMovementCategory(ex({ type: "bench", stance: "competition", equipment: "incline" }))
    ).toBe("anchor");
  });
});

describe("BIOMECHANICAL_BASELINES", () => {
  it("has entries for all three primary lifts", () => {
    expect(BIOMECHANICAL_BASELINES).toHaveProperty("bench");
    expect(BIOMECHANICAL_BASELINES).toHaveProperty("squat");
    expect(BIOMECHANICAL_BASELINES).toHaveProperty("deadlift");
  });

  it("bench lockout non-floor baseline is 90–95%", () => {
    const entry = BIOMECHANICAL_BASELINES.bench.lockout!;
    expect(entry.min).toBe(90);
    expect(entry.max).toBe(95);
  });

  it("bench lockout floor press override is 85–90%", () => {
    const override = BIOMECHANICAL_BASELINES.bench.lockout!.equipmentOverrides!.floor!;
    expect(override.min).toBe(85);
    expect(override.max).toBe(90);
  });

  it("squat quad_dominant baseline is 80–85%", () => {
    const entry = BIOMECHANICAL_BASELINES.squat.quad_dominant!;
    expect(entry.min).toBe(80);
    expect(entry.max).toBe(85);
  });

  it("deadlift bottom_range baseline is 85–90%", () => {
    const entry = BIOMECHANICAL_BASELINES.deadlift.bottom_range!;
    expect(entry.min).toBe(85);
    expect(entry.max).toBe(90);
  });

  it("deadlift quad_dominant baseline is 88–97%", () => {
    const entry = BIOMECHANICAL_BASELINES.deadlift.quad_dominant!;
    expect(entry.min).toBe(88);
    expect(entry.max).toBe(97);
  });

  it("categories not in the table are absent", () => {
    expect(BIOMECHANICAL_BASELINES.bench.quad_dominant).toBeUndefined();
    expect(BIOMECHANICAL_BASELINES.squat.lockout).toBeUndefined();
  });
});

function session(date: string, weight: number, reps = 1): TrainingSession {
  return { date: new Date(date), sets: 1, reps, weight, e1rm: calcE1RM(weight, reps), unit: "lbs" };
}

function pair(overrides: Partial<ConjugateExercise>, s: TrainingSession): ConjugateDataPair {
  const base: ConjugateExercise = {
    type: "bench",
    bar: "standard",
    stance: null,
    addlWts: [],
    equipment: null,
    displayName: "bench press",
    movementCategory: "anchor",
    ...overrides,
  };
  return [base, s];
}

describe("generateDiagnostics", () => {
  afterEach(() => {
    // Clean up any entries added to ACCOMMODATING_RESISTANCE_BASELINES during tests
    for (const key of Object.keys(ACCOMMODATING_RESISTANCE_BASELINES)) {
      delete ACCOMMODATING_RESISTANCE_BASELINES[key];
    }
  });

  it("emits an Optimal result when factor meets the baseline floor", () => {
    const pairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 300)),
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-08", 305)),
      pair(
        { movementCategory: "lockout", displayName: "board press", equipment: "board" },
        session("2024-01-04", 280)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.primaryLift).toBe("bench");
    expect(r.name).toBe("board press");
    expect(r.category).toBe("lockout");
    expect(r.expectedBaseline).toBe("90–95%");
    expect(r.diagnostic).toMatch(/^(Optimal|Weakness): board press at \d+%$/);
  });

  it("emits a Weakness result when factor falls below the baseline floor", () => {
    const pairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 300)),
      // board press at only 80% of anchor → below 90% floor
      pair(
        { movementCategory: "lockout", displayName: "board press", equipment: "board" },
        session("2024-01-01", 240)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(1);
    expect(results[0].diagnostic).toMatch(/^Weakness:/);
  });

  it("emits an Optimal result when factor meets the baseline floor (exact boundary)", () => {
    const pairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 100)),
      // board press at exactly 90% of anchor → meets 90% floor
      pair(
        { movementCategory: "lockout", displayName: "board press", equipment: "board" },
        session("2024-01-01", 90)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results[0].diagnostic).toMatch(/^Optimal:/);
  });

  it("applies floor press equipment override (85–90% instead of 90–95%)", () => {
    const pairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 300)),
      pair(
        { movementCategory: "lockout", displayName: "floor press", equipment: "floor" },
        session("2024-01-01", 260)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(1);
    expect(results[0].expectedBaseline).toBe("85–90%");
  });

  it("skips variations with sampleCount === 0 (no date overlap with anchor)", () => {
    const pairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 300)),
      // Variation with reps: 0 → fitVariantFactor skips it → sampleCount 0
      pair(
        { movementCategory: "lockout", displayName: "board press", equipment: "board" },
        { ...session("2024-06-01", 280), reps: 0 }
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(0);
  });

  it("skips unclassified movement categories", () => {
    const pairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 300)),
      pair(
        { movementCategory: "unclassified", displayName: "dumbbell fly" },
        session("2024-01-01", 100)
      ),
    ];
    expect(generateDiagnostics(pairs)).toHaveLength(0);
  });

  it("skips accessory exercises entirely", () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { type: "accessory", movementCategory: "unclassified", displayName: "tricep pushdown" },
        session("2024-01-01", 100)
      ),
    ];
    expect(generateDiagnostics(pairs)).toHaveLength(0);
  });

  it("skips variations with no baseline in the table (e.g., bench quad_dominant)", () => {
    const pairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 300)),
      // quad_dominant is not in bench baseline table
      pair(
        { movementCategory: "quad_dominant", displayName: "wide grip bench" },
        session("2024-01-01", 260)
      ),
    ];
    expect(generateDiagnostics(pairs)).toHaveLength(0);
  });

  it("uses ACCOMMODATING_RESISTANCE_BASELINES when name matches", () => {
    ACCOMMODATING_RESISTANCE_BASELINES["band squat"] = { range: "105–115%", floor: 105 };
    const sqPair = (cat: ConjugateExercise["movementCategory"], name: string, w: number) =>
      pair(
        { type: "squat", movementCategory: cat, displayName: name, equipment: null },
        session("2024-01-01", w)
      );

    const pairs: ConjugateDataPair[] = [
      sqPair("anchor", "squat", 400),
      // band squat at 108% → above floor of 105 → Optimal
      sqPair("lockout", "band squat", 432),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(1);
    expect(results[0].expectedBaseline).toBe("105–115%");
    expect(results[0].diagnostic).toMatch(/^Optimal:/);
  });

  it("handles multiple lifts and returns results for each", () => {
    const benchPairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 300)),
      pair(
        { movementCategory: "lockout", displayName: "board press", equipment: "board" },
        session("2024-01-01", 270)
      ),
    ];
    const deadPairs: ConjugateDataPair[] = [
      pair(
        { type: "deadlift", movementCategory: "anchor", displayName: "deadlift" },
        session("2024-01-01", 500)
      ),
      pair(
        {
          type: "deadlift",
          movementCategory: "lockout",
          displayName: "rack pull",
          equipment: "rack",
        },
        session("2024-01-01", 460)
      ),
    ];
    const results = generateDiagnostics([...benchPairs, ...deadPairs]);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.primaryLift).sort()).toEqual(["bench", "deadlift"]);
  });
});
