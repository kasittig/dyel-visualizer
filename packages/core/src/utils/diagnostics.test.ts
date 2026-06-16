import { describe, it, expect } from "vitest";
import { toMovementCategory, BIOMECHANICAL_BASELINES } from "./diagnostics";
import type { ConjugateExercise } from "../types/conjugate";

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

  it('bench with no matching rule → "unclassified"', () => {
    expect(toMovementCategory(ex({ type: "bench", stance: null, equipment: null }))).toBe(
      "unclassified"
    );
  });

  it("competition stance beats board equipment (priority check)", () => {
    expect(toMovementCategory(ex({ stance: "competition", equipment: "board" }))).toBe("anchor");
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
    const override = BIOMECHANICAL_BASELINES.bench.lockout!.equipmentOverrides?.floor!;
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

  it("categories not in the table are absent", () => {
    expect(BIOMECHANICAL_BASELINES.bench.quad_dominant).toBeUndefined();
    expect(BIOMECHANICAL_BASELINES.squat.lockout).toBeUndefined();
  });
});
