import { describe, expect, it } from "vitest";
import { conjugateLiftLabel, parseConjugateLift } from "./parseConjugate";

describe("parseConjugateLift", () => {
  describe("squat", () => {
    it("parses plain Squat", () => {
      expect(parseConjugateLift("Squat")).toEqual({
        liftType: "squat",
        variation: { bar: "standard", hasBox: false, hasChains: false, hasBands: false },
      });
    });

    it("parses Box Squat", () => {
      expect(parseConjugateLift("Box Squat")).toEqual({
        liftType: "squat",
        variation: { bar: "standard", hasBox: true, hasChains: false, hasBands: false },
      });
    });

    it("parses Squat (SSB)", () => {
      expect(parseConjugateLift("Squat (SSB)")).toEqual({
        liftType: "squat",
        variation: { bar: "ssb", hasBox: false, hasChains: false, hasBands: false },
      });
    });

    it("is case-insensitive", () => {
      expect(parseConjugateLift("box SQUAT")).toEqual({
        liftType: "squat",
        variation: { bar: "standard", hasBox: true, hasChains: false, hasBands: false },
      });
    });
  });

  describe("bench", () => {
    it("parses plain Bench", () => {
      expect(parseConjugateLift("Bench")).toEqual({
        liftType: "bench",
        variation: {
          bar: "standard",
          angle: "flat",
          grip: "competition",
          hasChains: false,
          hasBands: false,
          boardCount: null,
          hasSlingshot: false,
          hasPause: false,
        },
      });
    });

    it("parses Bench (American Bar)", () => {
      expect(parseConjugateLift("Bench (American Bar)")).toMatchObject({
        liftType: "bench",
        variation: { bar: "american" },
      });
    });

    it("parses Bench (American Bar, CG)", () => {
      expect(parseConjugateLift("Bench (American Bar, CG)")).toMatchObject({
        liftType: "bench",
        variation: { bar: "american", grip: "close" },
      });
    });

    it("parses Bench (CG)", () => {
      expect(parseConjugateLift("Bench (CG)")).toMatchObject({
        liftType: "bench",
        variation: { grip: "close" },
      });
    });

    it("parses Bench (Swiss Bar, Chain)", () => {
      expect(parseConjugateLift("Bench (Swiss Bar, Chain)")).toMatchObject({
        liftType: "bench",
        variation: { bar: "swiss", hasChains: true },
      });
    });

    it("parses Duffalo Bar Bench Press", () => {
      expect(parseConjugateLift("Duffalo Bar Bench Press")).toMatchObject({
        liftType: "bench",
        variation: { bar: "duffalo" },
      });
    });

    it("parses Duffalo Bar Bench Press (chain)", () => {
      expect(parseConjugateLift("Duffalo Bar Bench Press (chain)")).toMatchObject({
        liftType: "bench",
        variation: { bar: "duffalo", hasChains: true },
      });
    });

    it("parses Bench (bands)", () => {
      expect(parseConjugateLift("Bench (bands)")).toMatchObject({
        liftType: "bench",
        variation: { hasBands: true },
      });
    });

    it("parses Bench (slingshot, chain)", () => {
      expect(parseConjugateLift("Bench (slingshot, chain)")).toMatchObject({
        liftType: "bench",
        variation: { hasSlingshot: true, hasChains: true },
      });
    });

    it("parses Bench (2 Board)", () => {
      expect(parseConjugateLift("Bench (2 Board)")).toMatchObject({
        liftType: "bench",
        variation: { boardCount: 2 },
      });
    });

    it("parses Bench (Dumbbell)", () => {
      expect(parseConjugateLift("Bench (Dumbbell)")).toMatchObject({
        liftType: "bench",
        variation: { bar: "dumbbell" },
      });
    });

    it("parses Bench (Dumbbell, Decline)", () => {
      expect(parseConjugateLift("Bench (Dumbbell, Decline)")).toMatchObject({
        liftType: "bench",
        variation: { bar: "dumbbell", angle: "decline" },
      });
    });

    it("parses Incline Bench", () => {
      expect(parseConjugateLift("Incline Bench")).toMatchObject({
        liftType: "bench",
        variation: { angle: "incline" },
      });
    });

    it("parses Floor Press", () => {
      expect(parseConjugateLift("Floor Press")).toMatchObject({
        liftType: "bench",
        variation: { angle: "floor" },
      });
    });

    it("parses Floor Press (chain)", () => {
      expect(parseConjugateLift("Floor Press (chain)")).toMatchObject({
        liftType: "bench",
        variation: { angle: "floor", hasChains: true },
      });
    });

    it("parses Bench Builder as a bar type", () => {
      expect(parseConjugateLift("Bench Builder")).toMatchObject({
        liftType: "bench",
        variation: { bar: "bench_builder" },
      });
    });

    it("parses Bench (Commands) as hasPause", () => {
      expect(parseConjugateLift("Bench (Commands)")).toMatchObject({
        liftType: "bench",
        variation: { hasPause: true },
      });
    });

    it("is case-insensitive for bar names", () => {
      expect(parseConjugateLift("bench (SWISS BAR)")).toMatchObject({
        liftType: "bench",
        variation: { bar: "swiss" },
      });
    });
  });

  describe("deadlift", () => {
    it("parses plain Deadlift", () => {
      expect(parseConjugateLift("Deadlift")).toEqual({
        liftType: "deadlift",
        variation: {
          stance: "competition",
          hasChains: false,
          hasBands: false,
          hasReverseBands: false,
          blockHeight: null,
          deficitHeight: null,
        },
      });
    });

    it("parses Deadlift (opposite)", () => {
      expect(parseConjugateLift("Deadlift (opposite)")).toMatchObject({
        liftType: "deadlift",
        variation: { stance: "opposite" },
      });
    });

    it("parses Deadlift (sumo)", () => {
      expect(parseConjugateLift("Deadlift (sumo)")).toMatchObject({
        liftType: "deadlift",
        variation: { stance: "sumo" },
      });
    });

    it("parses Deadlift (conventional)", () => {
      expect(parseConjugateLift("Deadlift (conventional)")).toMatchObject({
        liftType: "deadlift",
        variation: { stance: "conventional" },
      });
    });

    it("parses Deadlift (romanian)", () => {
      expect(parseConjugateLift("Deadlift (romanian)")).toMatchObject({
        liftType: "deadlift",
        variation: { stance: "romanian" },
      });
    });

    it("parses Trap Bar Deadlift", () => {
      expect(parseConjugateLift("Trap Bar Deadlift")).toMatchObject({
        liftType: "deadlift",
        variation: { stance: "trap bar" },
      });
    });

    it("parses Deadlift (trap bar)", () => {
      expect(parseConjugateLift("Deadlift (trap bar)")).toMatchObject({
        liftType: "deadlift",
        variation: { stance: "trap bar" },
      });
    });

    it('parses Deadlift (2" Deficit)', () => {
      expect(parseConjugateLift('Deadlift (2" Deficit)')).toMatchObject({
        liftType: "deadlift",
        variation: { deficitHeight: 2 },
      });
    });

    it('parses Deadlift (2" Block)', () => {
      expect(parseConjugateLift('Deadlift (2" Block)')).toMatchObject({
        liftType: "deadlift",
        variation: { blockHeight: 2 },
      });
    });

    it("parses Deadlift (bands)", () => {
      expect(parseConjugateLift("Deadlift (bands)")).toMatchObject({
        liftType: "deadlift",
        variation: { hasBands: true, hasReverseBands: false },
      });
    });

    it("parses Deadlift (reverse bands) as hasReverseBands, not hasBands", () => {
      expect(parseConjugateLift("Deadlift (reverse bands)")).toMatchObject({
        liftType: "deadlift",
        variation: { hasReverseBands: true, hasBands: false },
      });
    });
  });

  describe("non-conjugate exercises", () => {
    it("returns null for Lat Pulldown", () => {
      expect(parseConjugateLift("Lat Pulldown")).toBeNull();
    });

    it("returns null for Overhead Press", () => {
      expect(parseConjugateLift("Overhead Press")).toBeNull();
    });
  });
});

describe("conjugateLiftLabel", () => {
  it("labels a plain squat", () => {
    expect(
      conjugateLiftLabel({
        liftType: "squat",
        variation: { bar: "standard", hasBox: false, hasChains: false, hasBands: false },
      })
    ).toBe("Squat");
  });

  it("labels SSB Box Squat w/ Chains", () => {
    expect(
      conjugateLiftLabel({
        liftType: "squat",
        variation: { bar: "ssb", hasBox: true, hasChains: true, hasBands: false },
      })
    ).toBe("SSB Box Squat w/ Chains");
  });

  it("labels Duffalo Bar Bench Press", () => {
    expect(
      conjugateLiftLabel({
        liftType: "bench",
        variation: {
          bar: "duffalo",
          angle: "flat",
          grip: "competition",
          hasChains: false,
          hasBands: false,
          boardCount: null,
          hasSlingshot: false,
          hasPause: false,
        },
      })
    ).toBe("Duffalo Bar Bench Press");
  });

  it("labels Swiss Bar Bench Press w/ Chains", () => {
    expect(
      conjugateLiftLabel({
        liftType: "bench",
        variation: {
          bar: "swiss",
          angle: "flat",
          grip: "competition",
          hasChains: true,
          hasBands: false,
          boardCount: null,
          hasSlingshot: false,
          hasPause: false,
        },
      })
    ).toBe("Swiss Bar Bench Press w/ Chains");
  });

  it("labels 2 Board Bench Press without inch mark", () => {
    expect(
      conjugateLiftLabel({
        liftType: "bench",
        variation: {
          bar: "standard",
          angle: "flat",
          grip: "competition",
          hasChains: false,
          hasBands: false,
          boardCount: 2,
          hasSlingshot: false,
          hasPause: false,
        },
      })
    ).toBe("2-Board Bench Press");
  });

  it("labels Floor Press w/ Chains", () => {
    expect(
      conjugateLiftLabel({
        liftType: "bench",
        variation: {
          bar: "standard",
          angle: "floor",
          grip: "competition",
          hasChains: true,
          hasBands: false,
          boardCount: null,
          hasSlingshot: false,
          hasPause: false,
        },
      })
    ).toBe("Floor Press w/ Chains");
  });

  it('labels Opposite 2" Deadlift', () => {
    expect(
      conjugateLiftLabel({
        liftType: "deadlift",
        variation: {
          stance: "opposite",
          hasChains: false,
          hasBands: false,
          hasReverseBands: false,
          blockHeight: 2,
          deficitHeight: null,
        },
      })
    ).toBe('Opposite 2" Deadlift');
  });

  it("labels Sumo Deadlift", () => {
    expect(
      conjugateLiftLabel({
        liftType: "deadlift",
        variation: {
          stance: "sumo",
          hasChains: false,
          hasBands: false,
          hasReverseBands: false,
          blockHeight: null,
          deficitHeight: null,
        },
      })
    ).toBe("Sumo Deadlift");
  });

  it("labels Trap Bar Deadlift", () => {
    expect(
      conjugateLiftLabel({
        liftType: "deadlift",
        variation: {
          stance: "trap bar",
          hasChains: false,
          hasBands: false,
          hasReverseBands: false,
          blockHeight: null,
          deficitHeight: null,
        },
      })
    ).toBe("Trap Bar Deadlift");
  });

  it("labels competition stance as plain Deadlift", () => {
    expect(
      conjugateLiftLabel({
        liftType: "deadlift",
        variation: {
          stance: "competition",
          hasChains: false,
          hasBands: false,
          hasReverseBands: false,
          blockHeight: null,
          deficitHeight: null,
        },
      })
    ).toBe("Deadlift");
  });

  it("labels Deadlift w/ Reverse Bands", () => {
    expect(
      conjugateLiftLabel({
        liftType: "deadlift",
        variation: {
          stance: "competition",
          hasChains: false,
          hasBands: false,
          hasReverseBands: true,
          blockHeight: null,
          deficitHeight: null,
        },
      })
    ).toBe("Deadlift w/ Reverse Bands");
  });
});
