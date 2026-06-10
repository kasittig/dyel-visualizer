import { describe, expect, it } from "vitest";
import { parseConjugateData } from "./parseConjugateData";

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
    expect(exercise.stance).toBeNull();
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

  it("sets displayName from conjugateLiftLabel", () => {
    const result = parseConjugateData(csv("2024-01-15,SSB Box Squat,3,5,275"));
    expect(result[0][0].displayName).toBe("SSB Box Squat");
  });
});
