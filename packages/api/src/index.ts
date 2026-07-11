export { getCompetitionTotal } from './getCompetitionTotal';
export { calculateVolumeCorrelationFromTagged } from './volume/volume';
export { parseTextData } from './text/parseTextData';
export { TOTAL_CHART_SPECS } from './totalChartSpecs';
export { buildChartDatasets } from './chart/buildChartDatasets';
export type { SplitRows } from './sheet/parseSheetData';
export type {
  PipelineModel,
  AthleteContext,
  RawInput,
  RenderParams,
  RechartsRow,
  ChartPoint,
  DatasetSpec,
  NormalizationModel,
  Point,
  PipelineResult,
  VariantAssessment,
  TaggedSetRecord,
  LiftType,
} from '@dyel/pipeline';
export { parseSheetData, groupByLiftType } from './sheet/parseSheetData';
export {
  CONJUGATE_BARS,
  CONJUGATE_STANCES,
  CONJUGATE_EQUIPMENT,
  CONJUGATE_ADDL_WTS,
  facetsFromTags,
  facetFamilyKey,
} from './conjugate/facets';
export type {
  ConjugateBar,
  ConjugateStance,
  ConjugateEquipment,
  ConjugateAddlWt,
} from '@dyel/pipeline';
export { defaultCompExerciseCanonical } from './sheet/defaultExercise';
export { computeStrengthScores } from './strengthScores';
export { LINE_COLORS } from './colors';
export { classifyExerciseName } from './validation/classifyExerciseName';
export { buildBestSetByLabelAndDate } from './conjugate/conjugateBestSet';
export type { BestSet } from './conjugate/conjugateBestSet';
export { conjugateChartSpecs } from './conjugate/conjugateChartSpecs';
export { buildLastSessionDetail } from './session/lastSessionDetail';
export type { LastSessionDetail } from './session/lastSessionDetail';
export {
  snapshotVariationsFromPipeline,
  snapshotNormalizedVariationsFromPipeline,
} from './variation/variationSnapshot';
export { buildCanonicalByLabel, resolveTargetLabel } from './variation/variationRadarSelectors';
export {
  mergeRechartsRowsToChartPoints,
  mergeWideRechartsRows,
  mergeVolumeIntoChartPoints,
  formatChartDate,
} from './chart/pipelineChartUtils';
export {
  selectBestE1RMPoint,
  findBestE1RMFromPipeline,
  predictWeightForReps,
  predictRepsForWeight,
  convertE1RMToDisplayUnit,
  resolveE1RMEstimate,
} from './repCalculator/repCalculatorUtils';
export type { E1RMEstimate } from './repCalculator/repCalculatorUtils';
export {
  availableEquipmentMagnitudes,
  exercisesForLiftType,
  resolveEffectiveCanonical,
} from './repCalculator/repCalculatorSelectors';
