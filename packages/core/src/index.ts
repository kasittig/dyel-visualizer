export type {
  ConjugateBar,
  ConjugateStance,
  ConjugateEquipment,
  ConjugateAddlWt,
  TrainingSession,
  ConjugateExercise,
  ConjugateDataPair,
  DeadliftStancePreference,
  PrimaryLift,
  EffectEnum,
  LiftType,
  GroupedConjugatePairs,
} from './types/conjugate';
export { variantLabel, familyKey } from './types/conjugate';
export type { LiftMetrics } from './types/metrics';

export { calculateMetrics } from './utils/math/metrics';
export {
  calcE1RM,
  invertE1RM,
  predictE1RM,
  fitAddlWtOffset,
  applyAddlWtOffset,
  fitVariantFactor,
} from './utils/math/e1rm';

export { calculateVolumeCorrelation } from './utils/math/volume';

export { parseConjugateData } from './utils/parsing/parseConjugateData';

export type {
  SheetValidationResult,
  SheetValidationIssue,
  ColumnInfo,
} from './utils/parsing/validateSheetCsv';
export { validateSheetCsv } from './utils/parsing/validateSheetCsv';

export type { IndexEntry } from './utils/parsing/parseIndexCsv';
export { parseIndexCsv } from './utils/parsing/parseIndexCsv';

export { extractCsvHeaders, parseCsvRows } from './utils/parsing/csvUtils';

export { filterByDateRange } from './utils/stats/exerciseFilters';

export type { E1RMEstimate, RepCalcStats } from './utils/math/repCalculator';
export {
  predictWeightForReps,
  predictRepsForWeight,
  findBestE1RM,
  normalizeToBaseE1RM,
} from './utils/math/repCalculator';

export type { SessionStats, LastSession } from './utils/stats/sessionIndex';
export { buildSessionStats, buildStraightByFamily } from './utils/stats/sessionIndex';

export { setsRepsLabel } from './utils/chart/setsRepsLabel';

export { LINE_COLORS, formatDate } from './utils/chart/chartUtils';

export type { ChartPoint } from './utils/chart/buildChartData';
export { buildChartData } from './utils/chart/buildChartData';

export type { VariationChartResult } from './utils/chart/buildVariationChartData';
export { NORMALIZED_KEY, buildVariationChartData } from './utils/chart/buildVariationChartData';

export { generateDiagnostics } from './utils/stats/diagnostics';

export { defaultBaselineName, defaultCompExerciseName } from './utils/stats/defaultSelections';
