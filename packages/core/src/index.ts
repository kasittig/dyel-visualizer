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
  EffectEnum,
} from './types/conjugate';
export { variantLabel, familyKey } from './types/conjugate';

export { calcE1RM, invertE1RM, predictE1RM, fitAddlWtOffset, fitVariantFactor } from './utils/e1rm';

export { parseConjugateData } from './utils/parseConjugateData';

export type {
  SheetValidationResult,
  SheetValidationIssue,
  ColumnInfo,
} from './utils/validateSheetCsv';
export { validateSheetCsv } from './utils/validateSheetCsv';

export type { IndexEntry } from './utils/parseIndexCsv';
export { parseIndexCsv } from './utils/parseIndexCsv';

export type { FilterState } from './utils/exerciseFilters';
export { emptyFilters, applyFilters } from './utils/exerciseFilters';

export type { E1RMEstimate, RepCalcStats } from './utils/repCalculator';
export {
  predictWeightForReps,
  predictRepsForWeight,
  findBestE1RM,
  normalizeToBaseE1RM,
} from './utils/repCalculator';

export type { SessionStats, LastSession } from './utils/sessionIndex';
export { buildSessionStats } from './utils/sessionIndex';

export { setsRepsLabel } from './utils/setsRepsLabel';

export { LINE_COLORS, formatDate } from './utils/chartUtils';

export type { ChartPoint } from './utils/buildChartData';
export { buildChartData } from './utils/buildChartData';

export type { VariationChartResult } from './utils/buildVariationChartData';
export { NORMALIZED_KEY, buildVariationChartData } from './utils/buildVariationChartData';

export type { DiagnosticsOptions } from './utils/diagnostics';
export { generateDiagnostics } from './utils/diagnostics';

export { defaultBaselineName, defaultTargetName } from './utils/defaultSelections';
