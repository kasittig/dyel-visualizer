// Define the shape of each exercise entry value
interface ExerciseModifierDetail {
  effects: import('./packages/core/src/types/conjugate').EffectEnum[];
  min?: number; // Optional because "addl_wt" keys do not have min/max
  max?: number; // Optional because "addl_wt" keys do not have min/max
}

interface MetricCoefficients {
  dots: Record<string, DotsMetricCoefficients>;
  schwartzmalone: Record<string, SchwartzMaloneMetricCoefficients>;
}

interface DotsMetricCoefficients {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
}

interface SchwartzMaloneMetricCoefficients {
  anchors: SMAnchorValue[];
}

interface SMAnchorValue {
  w: number;
  c: number;
}

// Global variable using this type; injected at runtime
declare const __MODIFIER__EFFECTS__: Record<string, ExerciseModifierDetail>;
declare const __COEFFICIENTS__: MetricCoefficients;
