export type {
  ConjugateBar,
  ConjugateStance,
  ConjugateEquipment,
  ConjugateAddlWt,
  TrainingSession,
  ConjugateExercise,
  ConjugateDataPair,
  MovementCategory,
  DeadliftStancePreference,
  DiagnosticResult,
  PrimaryLift,
} from "./types/conjugate";
export { variantLabel, familyKey } from "./types/conjugate";

export { calcE1RM, invertE1RM, predictE1RM, fitAddlWtOffset, fitVariantFactor } from "./utils/e1rm";

export { parseConjugateData } from "./utils/parseConjugateData";

export type { IndexEntry } from "./utils/parseIndexCsv";
export { parseIndexCsv } from "./utils/parseIndexCsv";

export type { FilterState } from "./utils/exerciseFilters";
export { emptyFilters, applyFilters } from "./utils/exerciseFilters";

export type { E1RMEstimate, RepCalcStats } from "./utils/repCalculator";
export {
  predictWeightForReps,
  predictRepsForWeight,
  findBestE1RM,
  normalizeToBaseE1RM,
} from "./utils/repCalculator";

export type { SessionStats } from "./utils/sessionIndex";
export { buildSessionStats } from "./utils/sessionIndex";

export { setsRepsLabel } from "./utils/setsRepsLabel";

export { LINE_COLORS, formatDate } from "./utils/chartUtils";

export type { ChartPoint } from "./utils/buildChartData";
export { buildChartData } from "./utils/buildChartData";

export type { DiagnosticsOptions } from "./utils/diagnostics";
export {
  BIOMECHANICAL_BASELINES,
  ACCOMMODATING_RESISTANCE_BASELINES,
  generateDiagnostics,
} from "./utils/diagnostics";
