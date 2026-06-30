interface ExerciseModifierDetail {
  effects: import('@dyel/core/src/types/conjugate').EffectEnum[];
  min?: number; // Optional because "addl_wt" keys do not have min/max
  max?: number; // Optional because "addl_wt" keys do not have min/max
}

interface MetricCoefficients {
  male: MetricCoefficientGroup;
  female: MetricCoefficientGroup;
}

interface MetricCoefficientGroup {
  dots: MetricCoefficient<number[]>;
  schwartzmalone: MetricCoefficient<SMAnchorValue[]>;
  wilks: MetricCoefficient<number[]>;
}

interface MetricCoefficient<T> {
  units: import('@dyel/core/src/types/conjugate').LiftUnits;
  coefficients: T;
  min_bw: number | undefined;
  max_bw: number | undefined;
  percentile: { mean: number; std: number };
}

interface SMAnchorValue {
  w: number;
  c: number;
}

// Global variable using this type; injected at runtime
declare const __MODIFIER__EFFECTS__: Record<string, ExerciseModifierDetail>;
declare const __COEFFICIENTS__: MetricCoefficients;
