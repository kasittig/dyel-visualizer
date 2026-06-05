import { describe, it, expect } from "vitest";
import { findCol } from "./useSheetData";

describe("findCol", () => {
  it("matches 'Weight (lbs)'", () => {
    expect(findCol({ "weight (lbs)": "135" }, "weight")).toBe("135");
  });

  it("matches 'weight (kg)'", () => {
    expect(findCol({ "weight (kg)": "60" }, "weight")).toBe("60");
  });

  it("matches bare 'weight'", () => {
    expect(findCol({ "weight": "100" }, "weight")).toBe("100");
  });

  it("matches 'Weight' (case-normalised by parser)", () => {
    expect(findCol({ "weight": "100" }, "weight")).toBe("100");
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
