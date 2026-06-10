export type SquatBar = "standard" | "ssb";
export type BenchBar =
  | "standard"
  | "american"
  | "swiss"
  | "bamboo"
  | "duffalo"
  | "dumbbell"
  | "bench_builder";
export type BenchGrip = "close" | "medium" | "competition";
export type BenchAngle = "flat" | "incline" | "decline" | "floor";

export interface SquatVariation {
  bar: SquatBar;
  hasBox: boolean;
  hasChains: boolean;
  hasBands: boolean;
}

export interface BenchVariation {
  bar: BenchBar;
  angle: BenchAngle;
  grip: BenchGrip;
  hasChains: boolean;
  hasBands: boolean;
  boardCount: number | null;
  hasSlingshot: boolean;
  hasPause: boolean;
}

export type DeadliftStance =
  | "competition"
  | "conventional"
  | "romanian"
  | "sumo"
  | "opposite"
  | "trap bar";

export interface DeadliftVariation {
  stance: DeadliftStance;
  hasChains: boolean;
  hasBands: boolean;
  hasReverseBands: boolean;
  blockHeight: number | null;
  deficitHeight: number | null;
}

export type ConjugateLift =
  | { liftType: "squat"; variation: SquatVariation }
  | { liftType: "bench"; variation: BenchVariation }
  | { liftType: "deadlift"; variation: DeadliftVariation };

export const DEFAULT_SQUAT_VARIATION: SquatVariation = {
  bar: "standard",
  hasBox: false,
  hasChains: false,
  hasBands: false,
};

export const DEFAULT_BENCH_VARIATION: BenchVariation = {
  bar: "standard",
  angle: "flat",
  grip: "competition",
  hasChains: false,
  hasBands: false,
  boardCount: null,
  hasSlingshot: false,
  hasPause: false,
};

export const DEFAULT_DEADLIFT_VARIATION: DeadliftVariation = {
  stance: "competition",
  hasChains: false,
  hasBands: false,
  hasReverseBands: false,
  blockHeight: null,
  deficitHeight: null,
};
