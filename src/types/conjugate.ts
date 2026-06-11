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
  | "bamboo";

// Different stances go here.
// We expect the stance type to impact the lifter's leverages which impacts the amount of force that they can transfer to the weight lifted
export type ConjugateStance =
  | "close"
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
  | "box";

// This is where ways of adding additional weight to the bar go.
// Additional weights can impact the stability of the bar and the effective amount of weight lifted.
export type ConjugateAddlWt = "bands" | "rev. bands" | "chains";

export interface TrainingSession {
  date: Date;
  sets: number;
  reps: number;
  weight: number;
  e1rm: number;
}

export interface ConjugateExercise {
  type: "squat" | "bench" | "deadlift";
  bar: ConjugateBar | null;
  stance: ConjugateStance | null;
  addlWts: ConjugateAddlWt[];
  equipment: ConjugateEquipment | null;
  displayName: string;
}

export function variantLabel(ex: ConjugateExercise): string {
  const parts: string[] = [];
  if (ex.bar !== "standard" && ex.bar !== null) parts.push(ex.bar);
  if (ex.stance !== "competition" && ex.stance !== null) parts.push(ex.stance);
  if (ex.equipment !== null) parts.push(ex.equipment);
  parts.push(...ex.addlWts);
  return parts.join(" + ");
}
