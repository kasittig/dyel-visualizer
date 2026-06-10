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

// Different bar types go here.
// We expect the bar type to impact the distribution of the weight on the bar
export type ConjugateBar =
  | "ssb"
  | "american"
  | "swiss"
  | "cambered"
  | "standard"
  | "trap bar"
  | "zercher"
  | "duffalo"
  | "dumbbell"
  | "bamboo";

// Different stances go here.
// We expect the stance type to impact the lifter's leverages which impacts the amount of force that they can transfer to the weight lifted
export type ConjugateStance =
  | "close grip"
  | "sumo"
  | "conventional"
  | "competition"
  | "opposite"
  | "medium grip"
  | "competition grip"
  | "wide grip"
  | "romanian"
  | "slingshot"
  | "builder";

// Different equipment types go here.
// Changing the equipment changes where the lifter's body is positioned relative to the weight and the ground
export type ConjugateEquipment =
  | "incline"
  | "decline"
  | "blocks"
  | "deficit"
  | "1 board"
  | "2 board"
  | "3 board"
  | "pause"
  | "floor"
  | "box";

// This is where ways of adding additional weight to the bar go.
// Additional weights can impact the stability of the bar and the effective amount of weight lifted.
export type ConjugateAddlWt = "bands" | "rev. bands" | "chains";

export interface TrainingSession {
  date: Date;
  sets: number;
  reps: number;
  weight: number;
}

export interface ConjugateExercise {
  type: "squat" | "bench" | "deadlift";
  bar: ConjugateBar | null;
  stance: ConjugateStance | null;
  addlWts: ConjugateAddlWt[];
  equipment: ConjugateEquipment | null;
  displayName: string;
  sessions: TrainingSession[];
}
