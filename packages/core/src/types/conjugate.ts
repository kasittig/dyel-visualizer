// Different bar types go here.
// We expect the bar type to impact the distribution of the weight on the bar
export type ConjugateBar =
  | "ssb"
  | "american"
  | "swiss"
  | "cambered"
  | "standard"
  | "trap"
  | "zercher"
  | "duffalo"
  | "dumbbell"
  | "bamboo"
  | "belt"
  | "goblet";

// Different stances go here.
// We expect the stance type to impact the lifter's leverages which impacts the amount of force that they can transfer to the weight lifted
export type ConjugateStance =
  | "close"
  | "narrow"
  | "sumo"
  | "conventional"
  | "competition"
  | "front"
  | "opposite"
  | "medium"
  | "wide"
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
  | "board"
  | "pause"
  | "floor"
  | "box"
  | "rack";

// This is where ways of adding additional weight to the bar go.
// Additional weights can impact the stability of the bar and the effective amount of weight lifted.
export type ConjugateAddlWt = "bands" | "rev. bands" | "chains";

export interface TrainingSession {
  date: Date;
  sets: number;
  reps: number;
  weight: number;
  e1rm: number;
  unit: "lbs" | "kg";
}

export interface ConjugateExercise {
  type: "squat" | "bench" | "deadlift" | "accessory";
  bar: ConjugateBar | null;
  stance: ConjugateStance | null;
  addlWts: ConjugateAddlWt[];
  equipment: ConjugateEquipment | null;
  displayName: string;
  movementCategory: MovementCategory;
}

export type PrimaryLift = Exclude<ConjugateExercise["type"], "accessory">;

export type ConjugateDataPair = [ConjugateExercise, TrainingSession];

export type MovementCategory =
  | "anchor"
  | "lockout"
  | "bottom_range"
  | "quad_dominant"
  | "posterior_chain"
  | "unclassified";

export type EffectEnum =
  | "QUAD_DOMINANT"
  | "POSTERIOR_CHAIN"
  | "HAMSTRING_DOMINANT"
  | "HIP_DOMINANT"
  | "TRICEP_DOMINANT"
  | "UPPER_PECS"
  | "LOWER_PECS"
  | "LOCKOUT"
  | "BOTTOM_RANGE"
  | "DEAD_STOP"
  | "REDUCED_ROM"
  | "EXTENDED_ROM"
  | "ACCOMMODATING_RESISTANCE"
  | "SUPRAMAXIMAL"
  | "STABILIZER_DEMAND"
  | "UPPER_BACK_DEMAND"
  | "CORE_DEMAND"
  | "SHOULDER_FRIENDLY"
  | "SPINE_DELOAD"
  | "UNILATERAL"
  | "BAR_SPEED"
  | "POSTERIOR_SHIFT"
  | "NO_LEG_DRIVE"
  | "UPRIGHT_TORSO";

export type DeadliftStancePreference = "sumo" | "conventional";

export interface DiagnosticResult {
  primaryLift: PrimaryLift;
  name: string;
  category: MovementCategory;
  averageIndex: number;
  expectedBaseline: string;
  status: "optimal" | "weakness" | "overtrained";
  diagnostic: string; // description only, no status prefix
  effects: EffectEnum[];
}

export function variantLabel(ex: ConjugateExercise): string {
  const parts: string[] = [];
  if (ex.bar !== "standard" && ex.bar !== null) parts.push(ex.bar);
  if (ex.stance !== "competition" && ex.stance !== null) parts.push(ex.stance);
  if (ex.equipment !== null) parts.push(ex.equipment);
  parts.push(...ex.addlWts);
  return parts.join(" + ");
}

export function familyKey(ex: ConjugateExercise): string {
  return [ex.type, ex.bar ?? "", ex.stance ?? "", ex.equipment ?? ""].join("|");
}
