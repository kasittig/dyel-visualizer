// Define the shape of each exercise entry value
interface ExerciseModifierDetail {
  effects: import('./packages/core/src/types/conjugate').EffectEnum[];
  min?: number; // Optional because "addl_wt" keys do not have min/max
  max?: number; // Optional because "addl_wt" keys do not have min/max
}

// Define explicit dictionary keys matching your pattern
type ExerciseModifierKey =
  | `bar:${string}`
  | `stance:${string}`
  | `equipment:${string}`
  | `addl_wt:${string}`;

// The final root JSON dictionary interface
interface ExerciseModifierMap {
  [key: string]: ExerciseModifierDetail;
}

// OPTIONAL: Declare a global variable using this type if injected at runtime
declare const __MODIFIER__EFFECTS__: Record<string, ExerciseModifierDetail>;
