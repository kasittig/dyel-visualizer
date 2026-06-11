import { describe, expect, it } from "vitest";
import { findCol, nameToExercise, parseConjugateData } from "./parseConjugateData";

function csv(...rows: string[]): string {
  return ["Date,Exercise,Sets,Reps,Weight (lbs)", ...rows].join("\n");
}

describe("parseConjugateData", () => {
  it("returns empty array for empty CSV", () => {
    expect(parseConjugateData("")).toEqual([]);
  });

  it("returns empty array when no exercise header is found", () => {
    expect(parseConjugateData("foo,bar\n1,2")).toEqual([]);
  });

  it("skips rows with unrecognized exercise names", () => {
    const result = parseConjugateData(csv("2024-01-01,Lat Pulldown,3,10,100"));
    expect(result).toHaveLength(0);
  });

  it("skips rows with missing or invalid date", () => {
    const result = parseConjugateData(csv(",Squat,3,5,315", "bad-date,Squat,3,5,315"));
    expect(result).toHaveLength(0);
  });

  it("skips rows with missing or zero reps", () => {
    const result = parseConjugateData(csv("2024-01-01,Squat,3,,315", "2024-01-01,Squat,3,0,315"));
    expect(result).toHaveLength(0);
  });

  it("parses a plain squat row", () => {
    const result = parseConjugateData(csv("2024-01-15,Squat,3,5,315"));
    expect(result).toHaveLength(1);
    const [exercise, session] = result[0];
    expect(exercise.type).toBe("squat");
    expect(exercise.bar).toBe("standard");
    expect(exercise.equipment).toBeNull();
    expect(exercise.addlWts).toEqual([]);
    expect(exercise.sessions).toEqual([]);
    expect(session.weight).toBe(315);
    expect(session.reps).toBe(5);
    expect(session.sets).toBe(3);
    expect(session.date).toBeInstanceOf(Date);
  });

  it("parses an SSB box squat with chains", () => {
    const result = parseConjugateData(csv("2024-01-15,SSB Box Squat (Chains),3,3,225"));
    const [exercise] = result[0];
    expect(exercise.bar).toBe("ssb");
    expect(exercise.equipment).toBe("box");
    expect(exercise.addlWts).toContain("chains");
  });

  it("parses a bench row with board count", () => {
    const result = parseConjugateData(csv("2024-01-15,Bench (2 Board),4,3,275"));
    const [exercise, session] = result[0];
    expect(exercise.type).toBe("bench");
    expect(exercise.equipment).toBe("2 board");
    expect(session.sets).toBe(4);
  });

  it("parses a deadlift row with reverse bands", () => {
    const result = parseConjugateData(csv("2024-01-15,Deadlift (Reverse Band),3,2,500"));
    const [exercise] = result[0];
    expect(exercise.type).toBe("deadlift");
    expect(exercise.addlWts).toContain("rev. bands");
    expect(exercise.addlWts).not.toContain("bands");
  });

  it("parses a trap bar deadlift", () => {
    const result = parseConjugateData(csv("2024-01-15,Trap Bar Deadlift,4,6,275"));
    const [exercise] = result[0];
    expect(exercise.bar).toBe("trap bar");
    expect(exercise.stance).toBe("competition");
  });

  it("skips leading title rows before the header", () => {
    const withTitle = [
      "My Training Log",
      "Week 1",
      "Date,Exercise,Sets,Reps,Weight (lbs)",
      "2024-01-15,Squat,3,5,315",
    ].join("\n");
    expect(parseConjugateData(withTitle)).toHaveLength(1);
  });

  it("handles weight column variants (weight (lbs), weight (kg))", () => {
    const withKg = ["Date,Exercise,Sets,Reps,Weight (kg)", "2024-01-15,Squat,3,5,140"].join("\n");
    const result = parseConjugateData(withKg);
    expect(result[0][1].weight).toBe(140);
  });

  it("defaults sets to 1 when sets column is absent", () => {
    const noSets = ["Date,Exercise,Reps,Weight (lbs)", "2024-01-15,Squat,5,315"].join("\n");
    expect(parseConjugateData(noSets)[0][1].sets).toBe(1);
  });

  it("parses multiple rows and skips non-conjugate ones", () => {
    const result = parseConjugateData(
      csv(
        "2024-01-15,Squat,3,5,315",
        "2024-01-15,Lat Pulldown,3,10,100",
        "2024-01-15,Bench,4,3,225",
        "2024-01-15,Bicep Curl,3,12,40"
      )
    );
    expect(result).toHaveLength(2);
    expect(result[0][0].type).toBe("squat");
    expect(result[1][0].type).toBe("bench");
  });

  it("sets displayName from input", () => {
    const result = parseConjugateData(csv("2024-01-15,Box SSB,3,5,275"));
    expect(result[0][0].displayName).toBe("Box SSB");
  });
});

describe("nameToExercise", () => {
  describe("squat", () => {
    it("parses plain Squat", () => {
      expect(nameToExercise("Squat")).toEqual({
        type: "squat",
        bar: "standard",
        stance: null,
        addlWts: [],
        equipment: null,
        displayName: "Squat",
        sessions: [],
      });
    });

    it("parses Box Squat", () => {
      expect(nameToExercise("Box Squat")).toMatchObject({
        type: "squat",
        bar: "standard",
        equipment: "box",
        addlWts: [],
      });
    });

    it("parses Squat (SSB)", () => {
      expect(nameToExercise("Squat (SSB)")).toMatchObject({
        type: "squat",
        bar: "ssb",
        equipment: null,
      });
    });

    it("is case-insensitive", () => {
      expect(nameToExercise("box SQUAT")).toMatchObject({
        type: "squat",
        bar: "standard",
        equipment: "box",
      });
    });
  });

  describe("bench", () => {
    it("parses plain Bench", () => {
      expect(nameToExercise("Bench")).toEqual({
        type: "bench",
        bar: "standard",
        stance: "competition grip",
        addlWts: [],
        equipment: null,
        displayName: "Bench",
        sessions: [],
      });
    });

    it("parses Bench (American Bar)", () => {
      expect(nameToExercise("Bench (American Bar)")).toMatchObject({
        type: "bench",
        bar: "american",
      });
    });

    it("parses Bench (American Bar, CG)", () => {
      expect(nameToExercise("Bench (American Bar, CG)")).toMatchObject({
        type: "bench",
        bar: "american",
        stance: "close grip",
      });
    });

    it("parses Bench (CG)", () => {
      expect(nameToExercise("Bench (CG)")).toMatchObject({
        type: "bench",
        stance: "close grip",
      });
    });

    it("parses Bench (Swiss Bar, Chain)", () => {
      expect(nameToExercise("Bench (Swiss Bar, Chain)")).toMatchObject({
        type: "bench",
        bar: "swiss",
        addlWts: ["chains"],
      });
    });

    it("parses Duffalo Bar Bench Press", () => {
      expect(nameToExercise("Duffalo Bar Bench Press")).toMatchObject({
        type: "bench",
        bar: "duffalo",
      });
    });

    it("parses Duffalo Bar Bench Press (chain)", () => {
      expect(nameToExercise("Duffalo Bar Bench Press (chain)")).toMatchObject({
        type: "bench",
        bar: "duffalo",
        addlWts: ["chains"],
      });
    });

    it("parses Bench (bands)", () => {
      expect(nameToExercise("Bench (bands)")).toMatchObject({
        type: "bench",
        addlWts: ["bands"],
      });
    });

    it("parses Bench (slingshot, chain)", () => {
      expect(nameToExercise("Bench (slingshot, chain)")).toMatchObject({
        type: "bench",
        stance: "slingshot",
        addlWts: ["chains"],
      });
    });

    it("parses Bench (2 Board)", () => {
      expect(nameToExercise("Bench (2 Board)")).toMatchObject({
        type: "bench",
        equipment: "2 board",
      });
    });

    it("parses Bench (Dumbbell)", () => {
      expect(nameToExercise("Bench (Dumbbell)")).toMatchObject({
        type: "bench",
        bar: "dumbbell",
      });
    });

    it("parses Bench (Dumbbell, Decline)", () => {
      expect(nameToExercise("Bench (Dumbbell, Decline)")).toMatchObject({
        type: "bench",
        bar: "dumbbell",
        equipment: "decline",
      });
    });

    it("parses Incline Bench", () => {
      expect(nameToExercise("Incline Bench")).toMatchObject({
        type: "bench",
        equipment: "incline",
      });
    });

    it("parses Floor Press", () => {
      expect(nameToExercise("Floor Press")).toMatchObject({
        type: "bench",
        equipment: "floor",
      });
    });

    it("parses Floor Press (chain)", () => {
      expect(nameToExercise("Floor Press (chain)")).toMatchObject({
        type: "bench",
        equipment: "floor",
        addlWts: ["chains"],
      });
    });

    it("parses Bench Builder as standard bar", () => {
      expect(nameToExercise("Bench Builder")).toMatchObject({
        type: "bench",
        bar: "standard",
        stance: "builder",
      });
    });

    it("parses Bench (Commands) as pause equipment", () => {
      expect(nameToExercise("Bench (Commands)")).toMatchObject({
        type: "bench",
        equipment: "pause",
      });
    });

    it("is case-insensitive for bar names", () => {
      expect(nameToExercise("bench (SWISS BAR)")).toMatchObject({
        type: "bench",
        bar: "swiss",
      });
    });
  });

  describe("deadlift", () => {
    it("parses plain Deadlift", () => {
      expect(nameToExercise("Deadlift")).toEqual({
        type: "deadlift",
        bar: "standard",
        stance: "competition",
        addlWts: [],
        equipment: null,
        displayName: "Deadlift",
        sessions: [],
      });
    });

    it("parses Deadlift (opposite)", () => {
      expect(nameToExercise("Deadlift (opposite)")).toMatchObject({
        type: "deadlift",
        stance: "opposite",
      });
    });

    it("parses Deadlift (sumo)", () => {
      expect(nameToExercise("Deadlift (sumo)")).toMatchObject({
        type: "deadlift",
        stance: "sumo",
      });
    });

    it("parses Deadlift (conventional)", () => {
      expect(nameToExercise("Deadlift (conventional)")).toMatchObject({
        type: "deadlift",
        stance: "conventional",
      });
    });

    it("parses Deadlift (romanian)", () => {
      expect(nameToExercise("Deadlift (romanian)")).toMatchObject({
        type: "deadlift",
        stance: "romanian",
      });
    });

    it("parses Trap Bar Deadlift", () => {
      expect(nameToExercise("Trap Bar Deadlift")).toMatchObject({
        type: "deadlift",
        bar: "trap bar",
        stance: "competition",
      });
    });

    it("parses Deadlift (trap bar)", () => {
      expect(nameToExercise("Deadlift (trap bar)")).toMatchObject({
        type: "deadlift",
        bar: "trap bar",
        stance: "competition",
      });
    });

    it('parses Deadlift (2" Deficit)', () => {
      expect(nameToExercise('Deadlift (2" Deficit)')).toMatchObject({
        type: "deadlift",
        equipment: "deficit",
      });
    });

    it('parses Deadlift (2" Block)', () => {
      expect(nameToExercise('Deadlift (2" Block)')).toMatchObject({
        type: "deadlift",
        equipment: "blocks",
      });
    });

    it("parses Deadlift (bands)", () => {
      expect(nameToExercise("Deadlift (bands)")).toMatchObject({
        type: "deadlift",
        addlWts: ["bands"],
      });
    });

    it("parses Deadlift (reverse bands) as rev. bands, not bands", () => {
      expect(nameToExercise("Deadlift (reverse bands)")).toMatchObject({
        type: "deadlift",
        addlWts: ["rev. bands"],
      });
    });
  });

  describe("non-conjugate exercises", () => {
    it("returns null for Lat Pulldown", () => {
      expect(nameToExercise("Lat Pulldown")).toBeNull();
    });

    it("returns null for Overhead Press", () => {
      expect(nameToExercise("Overhead Press")).toBeNull();
    });
  });
});

describe("findCol", () => {
  it("matches 'Weight (lbs)'", () => {
    expect(findCol({ "weight (lbs)": "135" }, "weight")).toBe("135");
  });

  it("matches 'weight (kg)'", () => {
    expect(findCol({ "weight (kg)": "60" }, "weight")).toBe("60");
  });

  it("matches bare 'weight'", () => {
    expect(findCol({ weight: "100" }, "weight")).toBe("100");
  });

  it("does not match 'bodyweight (lbs)'", () => {
    expect(findCol({ "bodyweight (lbs)": "175" }, "weight")).toBeUndefined();
  });

  it("does not match 'body weight (lbs)'", () => {
    expect(findCol({ "body weight (lbs)": "175" }, "weight")).toBeUndefined();
  });

  it("prefers weight over bodyweight when both columns present", () => {
    const row = { "bodyweight (lbs)": "175", "weight (lbs)": "135" };
    expect(findCol(row, "weight")).toBe("135");
  });
});
