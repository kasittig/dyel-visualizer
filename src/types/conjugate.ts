export type SquatBar = "standard" | "ssb";
export type BenchBar = "standard" | "american" | "swiss" | "bamboo";

export interface SquatVariation {
  bar: SquatBar;
  hasBox: boolean;
  hasChains: boolean;
  hasBands: boolean;
}

export interface BenchVariation {
  bar: BenchBar;
  hasChains: boolean;
  hasBands: boolean;
  isFloorPress: boolean;
}

export interface DeadliftVariation {
  isReverseStance: boolean;
  hasChains: boolean;
  hasBands: boolean;
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
  hasChains: false,
  hasBands: false,
  isFloorPress: false,
};

export const DEFAULT_DEADLIFT_VARIATION: DeadliftVariation = {
  isReverseStance: false,
  hasChains: false,
  hasBands: false,
  blockHeight: null,
  deficitHeight: null,
};
