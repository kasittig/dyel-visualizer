import { describe, it, expect } from "vitest";
import { extractSheetRef, distinctDisplayNames } from "./appUtils";
import type { ConjugateDataPair, ConjugateExercise } from "@dyel/core";

describe("extractSheetRef", () => {
  it("parses a published web URL as published", () => {
    const ref = extractSheetRef("https://docs.google.com/spreadsheets/d/e/2PACX-abc_123/pubhtml");
    expect(ref).toEqual({ id: "2PACX-abc_123", published: true });
  });

  it("parses a /u/0/ published URL as published", () => {
    const ref = extractSheetRef(
      "https://docs.google.com/spreadsheets/u/0/d/e/PUBID/pub?output=csv"
    );
    expect(ref).toEqual({ id: "PUBID", published: true });
  });

  it("parses an edit/view URL as not published", () => {
    const ref = extractSheetRef(
      "https://docs.google.com/spreadsheets/d/1Uwfzrb4wjYcBisTPdNEUGJyvfKRLwpN0tm8ciRPHB0c/edit#gid=0"
    );
    expect(ref).toEqual({
      id: "1Uwfzrb4wjYcBisTPdNEUGJyvfKRLwpN0tm8ciRPHB0c",
      published: false,
    });
  });

  it("accepts a bare sheet id (20+ chars)", () => {
    const ref = extractSheetRef("1Uwfzrb4wjYcBisTPdNEUGJyvfKRLwpN0tm8ciRPHB0c");
    expect(ref).toEqual({
      id: "1Uwfzrb4wjYcBisTPdNEUGJyvfKRLwpN0tm8ciRPHB0c",
      published: false,
    });
  });

  it("returns null for unrelated text and short ids", () => {
    expect(extractSheetRef("https://example.com")).toBeNull();
    expect(extractSheetRef("short-id")).toBeNull();
    expect(extractSheetRef("")).toBeNull();
  });
});

function pair(displayName: string): ConjugateDataPair {
  const ex = { displayName } as ConjugateExercise;
  return [ex, {} as ConjugateDataPair[1]];
}

describe("distinctDisplayNames", () => {
  it("returns names in first-seen order without duplicates", () => {
    const rows = [pair("Squat"), pair("SSB Squat"), pair("Squat"), pair("Box Squat")];
    expect(distinctDisplayNames(rows)).toEqual(["Squat", "SSB Squat", "Box Squat"]);
  });

  it("returns an empty array for no rows", () => {
    expect(distinctDisplayNames([])).toEqual([]);
  });
});
