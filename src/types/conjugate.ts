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
  chainWeight: number | null;
  hasBands: boolean;
  bandWeight: number | null;
}

export interface BenchVariation {
  bar: BenchBar;
  angle: BenchAngle;
  grip: BenchGrip;
  hasChains: boolean;
  chainWeight: number | null;
  hasBands: boolean;
  bandWeight: number | null;
  boardCount: number | null;
  hasSlingshot: boolean;
  hasPause: boolean;
}

export interface DeadliftVariation {
  isReverseStance: boolean;
  hasChains: boolean;
  chainWeight: number | null;
  hasBands: boolean;
  bandWeight: number | null;
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
  chainWeight: null,
  hasBands: false,
  bandWeight: null,
};

export const DEFAULT_BENCH_VARIATION: BenchVariation = {
  bar: "standard",
  angle: "flat",
  grip: "competition",
  hasChains: false,
  chainWeight: null,
  hasBands: false,
  bandWeight: null,
  boardCount: null,
  hasSlingshot: false,
  hasPause: false,
};

export const DEFAULT_DEADLIFT_VARIATION: DeadliftVariation = {
  isReverseStance: false,
  hasChains: false,
  chainWeight: null,
  hasBands: false,
  bandWeight: null,
  hasReverseBands: false,
  blockHeight: null,
  deficitHeight: null,
};
