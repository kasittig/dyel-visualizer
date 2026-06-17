import { describe, it, expect } from "vitest";
import { toMovementCategory, MODIFIER_EFFECTS, generateDiagnostics } from "./diagnostics";
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

  it('bare deadlift (no stance) + no preference (default conventional) → "quad_dominant"', () => {
    expect(toMovementCategory(ex({ type: "deadlift", stance: null, equipment: null }))).toBe(
      "quad_dominant"
    );
  });

  it('bare deadlift (no stance) + conventional primary → "quad_dominant"', () => {
    expect(
      toMovementCategory(ex({ type: "deadlift", stance: null, equipment: null }), {
        deadliftStance: "conventional",
      })
    ).toBe("quad_dominant");
  });

  it('bare deadlift (no stance) + sumo primary → "posterior_chain"', () => {
    expect(
      toMovementCategory(ex({ type: "deadlift", stance: null, equipment: null }), {
        deadliftStance: "sumo",
      })
    ).toBe("posterior_chain");
  });

  it('deadlift + sumo stance → "posterior_chain" (sumo is posterior chain dominant)', () => {
    expect(toMovementCategory(ex({ type: "deadlift", stance: "sumo", equipment: null }))).toBe(
      "posterior_chain"
    );
  });

  it('deadlift + sumo stance + sumo primary → "posterior_chain"', () => {
    expect(
      toMovementCategory(ex({ type: "deadlift", stance: "sumo", equipment: null }), {
        deadliftStance: "sumo",
      })
    ).toBe("posterior_chain");
  });

  it('deadlift + conventional stance → "quad_dominant" (conventional is quad dominant)', () => {
    expect(
      toMovementCategory(ex({ type: "deadlift", stance: "conventional", equipment: null }))
    ).toBe("quad_dominant");
  });

  it('deadlift + conventional stance + sumo primary → "quad_dominant"', () => {
    expect(
      toMovementCategory(ex({ type: "deadlift", stance: "conventional", equipment: null }), {
        deadliftStance: "sumo",
      })
    ).toBe("quad_dominant");
  });

  it('deadlift + opposite stance + conventional primary → "posterior_chain" (opposite = sumo)', () => {
    expect(toMovementCategory(ex({ type: "deadlift", stance: "opposite", equipment: null }))).toBe(
      "posterior_chain"
    );
  });

  it('deadlift + opposite stance + conventional primary (explicit) → "posterior_chain" (opposite = sumo)', () => {
    expect(
      toMovementCategory(ex({ type: "deadlift", stance: "opposite", equipment: null }), {
        deadliftStance: "conventional",
      })
    ).toBe("posterior_chain");
  });

  it('deadlift + opposite stance + sumo primary → "quad_dominant" (opposite = conventional)', () => {
    expect(
      toMovementCategory(ex({ type: "deadlift", stance: "opposite", equipment: null }), {
        deadliftStance: "sumo",
      })
    ).toBe("quad_dominant");
  });

  it('bench with no matching rule → "unclassified"', () => {
    expect(toMovementCategory(ex({ type: "bench", stance: null, equipment: null }))).toBe(
      "unclassified"
    );
  });

  it("board equipment beats competition stance (parser default)", () => {
    expect(toMovementCategory(ex({ stance: "competition", equipment: "board" }))).toBe("lockout");
  });

  it("incline equipment beats competition stance (parser default)", () => {
    expect(
      toMovementCategory(ex({ type: "bench", stance: "competition", equipment: "incline" }))
    ).toBe("lockout");
  });

  it('deadlift + deficit equipment + competition stance (parser default) → "bottom_range"', () => {
    expect(
      toMovementCategory(ex({ type: "deadlift", stance: "competition", equipment: "deficit" }))
    ).toBe("bottom_range");
  });

  it('deadlift + blocks equipment + competition stance (parser default) → "lockout"', () => {
    expect(
      toMovementCategory(ex({ type: "deadlift", stance: "competition", equipment: "blocks" }))
    ).toBe("lockout");
  });
});

describe("MODIFIER_EFFECTS", () => {
  it("equipment:board:bench has min 105, max 115", () => {
    const e = MODIFIER_EFFECTS["equipment:board:bench"];
    expect(e).toBeDefined();
    expect("min" in e).toBe(true);
    if ("min" in e) {
      expect(e.min).toBe(105);
      expect(e.max).toBe(115);
    }
  });

  it("equipment:floor:bench has min 85, max 95", () => {
    const e = MODIFIER_EFFECTS["equipment:floor:bench"];
    expect(e).toBeDefined();
    expect("min" in e).toBe(true);
    if ("min" in e) {
      expect(e.min).toBe(85);
      expect(e.max).toBe(95);
    }
  });

  it("equipment:rack:deadlift has min 110, max 130", () => {
    const e = MODIFIER_EFFECTS["equipment:rack:deadlift"];
    expect(e).toBeDefined();
    expect("min" in e).toBe(true);
    if ("min" in e) {
      expect(e.min).toBe(110);
      expect(e.max).toBe(130);
    }
  });

  it("stance:romanian:deadlift has min 60, max 75", () => {
    const e = MODIFIER_EFFECTS["stance:romanian:deadlift"];
    expect(e).toBeDefined();
    expect("min" in e).toBe(true);
    if ("min" in e) {
      expect(e.min).toBe(60);
      expect(e.max).toBe(75);
    }
  });

  it("addl_wt:chains:squat has no min/max", () => {
    const e = MODIFIER_EFFECTS["addl_wt:chains:squat"];
    expect(e).toBeDefined();
    expect("min" in e).toBe(false);
  });

  it("equipment:board:bench effects contain LOCKOUT and REDUCED_ROM", () => {
    const e = MODIFIER_EFFECTS["equipment:board:bench"];
    expect(e.effects).toContain("LOCKOUT");
    expect(e.effects).toContain("REDUCED_ROM");
  });

  it("stance:ssb:squat does not exist (key is bar:ssb:squat)", () => {
    expect(MODIFIER_EFFECTS["stance:ssb:squat"]).toBeUndefined();
    expect(MODIFIER_EFFECTS["bar:ssb:squat"]).toBeDefined();
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
  it("emits a result when factor meets the baseline floor", () => {
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
    expect(r.expectedBaseline).toBe("105–115%");
    expect(r.diagnostic).toMatch(/^(Optimal|Weakness): board press at \d+%$/);
  });

  it("board press result includes LOCKOUT and REDUCED_ROM effects", () => {
    const pairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 300)),
      pair(
        { movementCategory: "lockout", displayName: "board press", equipment: "board" },
        session("2024-01-01", 280)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results[0].effects).toContain("LOCKOUT");
    expect(results[0].effects).toContain("REDUCED_ROM");
  });

  it("emits a Weakness result when factor falls below the baseline floor", () => {
    const pairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 300)),
      // board press at only 80% of anchor → below 105% floor
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
      // floor press at exactly 85% of anchor → meets 85% floor (equipment:floor:bench = 85-95%)
      pair(
        { movementCategory: "lockout", displayName: "floor press", equipment: "floor" },
        session("2024-01-01", 85)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results[0].diagnostic).toMatch(/^Optimal:/);
  });

  it("floor press baseline is 85–95% (from CSV)", () => {
    const pairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 300)),
      pair(
        { movementCategory: "lockout", displayName: "floor press", equipment: "floor" },
        session("2024-01-01", 260)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(1);
    expect(results[0].expectedBaseline).toBe("85–95%");
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

  it("skips variations with no non-standard modifier to look up", () => {
    const pairs: ConjugateDataPair[] = [
      pair({ movementCategory: "anchor", displayName: "bench press" }, session("2024-01-01", 300)),
      // quad_dominant with standard bar, null stance, no equipment → no modifier key → skipped
      pair(
        { movementCategory: "quad_dominant", displayName: "wide grip bench" },
        session("2024-01-01", 260)
      ),
    ];
    expect(generateDiagnostics(pairs)).toHaveLength(0);
  });

  it("opposite-stance DL with default conventional primary produces posterior_chain result (opposite = sumo)", () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { type: "deadlift", movementCategory: "anchor", displayName: "deadlift" },
        session("2024-01-01", 500)
      ),
      pair(
        {
          type: "deadlift",
          movementCategory: "posterior_chain",
          stance: "opposite",
          displayName: "deadlift (opposite)",
        },
        session("2024-01-01", 460)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("posterior_chain");
    expect(results[0].name).toBe("deadlift (opposite)");
  });

  it("sumo-stance DL with sumo primary produces posterior_chain result", () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { type: "deadlift", movementCategory: "anchor", displayName: "deadlift" },
        session("2024-01-01", 500)
      ),
      pair(
        {
          type: "deadlift",
          movementCategory: "posterior_chain",
          stance: "sumo",
          displayName: "deadlift (sumo)",
        },
        session("2024-01-01", 460)
      ),
    ];
    // stance:sumo:deadlift has a baseline (90–100%)
    const results = generateDiagnostics(pairs, { deadliftStance: "sumo" });
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("posterior_chain");
    expect(results[0].name).toBe("deadlift (sumo)");
    expect(results[0].effects).toContain("POSTERIOR_CHAIN");
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
