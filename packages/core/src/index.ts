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
  LiftUnits,
} from './types/conjugate';
export { variantLabel, familyKey } from './types/conjugate';
export {
  CONJUGATE_BARS,
  CONJUGATE_STANCES,
  CONJUGATE_EQUIPMENT,
  CONJUGATE_ADDL_WTS,
} from './types/conjugate';
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

export type {
  SheetValidationResult,
  SheetValidationIssue,
  ColumnInfo,
} from './transform/validateSheetCsv';
export { validateSheetCsv } from './transform/validateSheetCsv';

export type { TextValidationResult, TextValidationIssue } from './transform/validateTextData';
export { validateTextData } from './transform/validateTextData';

export type { IndexEntry } from './transform/parseIndexCsv';
export { parseIndexCsv } from './transform/parseIndexCsv';

export type { E1RMEstimate, RepCalcStats } from './utils/stats/repCalculator';
export {
  predictWeightForReps,
  predictRepsForWeight,
  findBestE1RM,
  normalizeToBaseE1RM,
} from './utils/stats/repCalculator';

export type { SessionStats, LastSession } from './utils/stats/sessionIndex';
export { buildSessionStats, buildStraightByFamily } from './utils/stats/sessionIndex';

export { setsRepsLabel } from './utils/chart/setsRepsLabel';

export { LINE_COLORS, formatDate } from './utils/chart/chartUtils';

export type { VariationChartResult } from './load/buildVariationChartData';
export { NORMALIZED_KEY, buildVariationChartData } from './load/buildVariationChartData';

export { defaultBaselineName, defaultCompExerciseName } from './utils/lifts/defaultSelections';
export { parseConjugateData } from './transform/parseConjugateData';
export { generateDiagnostics } from './load/generateDiagnostics';

export type { TextFieldInput } from './types/TextFieldInput';
export { extractTextLines } from './extract/textExtract';
export type { ChartPoint } from './types/chart.ts';

export { recordMax, sortedGridDates } from './utils/chart/chartGrid';
export type { DateValueGrid } from './utils/chart/chartGrid';
export { textLineToRow } from './transform/parsers/textLineToRow';
export { nameToExercise } from './transform/parsers/nameToExercise';
export { parseSession } from './transform/parsers/parseSession';
export { detectWeightUnit } from './transform/parsers/detectWeightUnit';
export { localDateKey } from './utils/math/localDateKey';
