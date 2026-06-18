// Define the shape of each exercise entry value
interface ExerciseModifierDetail {
  effects: import('./packages/core/src/types/conjugate').EffectEnum[];
  min?: number; // Optional because "addl_wt" keys do not have min/max
  max?: number; // Optional because "addl_wt" keys do not have min/max
}

// Global variable using this type; injected at runtime
declare const __MODIFIER__EFFECTS__: Record<string, ExerciseModifierDetail>;
