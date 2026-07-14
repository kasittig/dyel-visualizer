export { getCompetitionTotal } from './getCompetitionTotal';
export { calculateVolumeCorrelationFromTagged } from './volume/volume';
export { parseTextData } from './text/parseTextData';
export { TOTAL_CHART_SPECS } from './totalChartSpecs';
export { buildChartDatasets } from './chart/buildChartDatasets';
export { convertWeight, roundWeight, formatWeight } from './weightUnit';
export type { SplitRows } from './sheet/parseSheetData';
export type { DisplayUnit } from './weightUnit';
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
export { parseIndexCsv, type IndexEntry } from './sheet/parseIndexCsv';
export {
  loadIndexPipelineModels,
  type LifterPipelineResult,
} from './sheet/loadIndexPipelineModels';
export { buildPipelineModel } from './pipeline/buildPipelineModel';
export { validatePipelineRun } from './pipeline/validatePipelineRun';
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
export { resolveAutoDeadliftStance } from './sheet/autoDeadliftStance';
export { computeStrengthScores, strengthTierForPercentile } from './strengthScores';
export { LINE_COLORS } from './colors';
export { classifyExerciseName } from './validation/classifyExerciseName';
export { classifyPipelineVerdict } from './validation/validationVerdict';
export { validateSheetCsv } from './validation/pipelineSheetValidator';
export type {
  SheetValidationResult,
  SheetValidationIssue,
  ColumnInfo,
} from './validation/pipelineSheetValidator';
export { validateTextData } from './validation/pipelineFreeformValidator';
export type {
  TextValidationResult,
  TextValidationIssue,
} from './validation/pipelineFreeformValidator';
export { buildBestSetByLabelAndDate } from './conjugate/conjugateBestSet';
export type { BestSet } from './conjugate/conjugateBestSet';
export { conjugateChartSpecs } from './conjugate/conjugateChartSpecs';
export { buildConjugateChartData, roundBestSetsForDisplay } from './conjugate/conjugateChartData';
export type { ConjugateChartData } from './conjugate/conjugateChartData';
export {
  buildLastSessionDetail,
  buildLastSessionDetailForCanonical,
  buildSessionCountForCanonical,
  formatLastSessionSummary,
} from './session/lastSessionDetail';
export type { LastSessionDetail } from './session/lastSessionDetail';
export { buildAccessoryTableRows } from './accessory/accessorySubtypeTable';
export type { AccessoryTableRow, AccessorySubtype } from './accessory/accessorySubtypeTable';
export {
  snapshotVariationsFromPipeline,
  snapshotNormalizedVariationsFromPipeline,
} from './variation/variationSnapshot';
export {
  buildCanonicalByLabel,
  resolveTargetLabel,
  buildRadarRows,
} from './variation/variationRadarSelectors';
export type { RadarRow } from './variation/variationRadarSelectors';
export {
  latestLiftE1RMs,
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
  roundTo5,
} from './repCalculator/repCalculatorUtils';
export type { E1RMEstimate } from './repCalculator/repCalculatorUtils';
export {
  availableEquipmentMagnitudes,
  exercisesForLiftType,
  resolveEffectiveCanonical,
} from './repCalculator/repCalculatorSelectors';
export {
  dateRangeToRenderParams,
  isRecordInDateRange,
  presetDateRange,
  activePreset,
  defaultDateRangeFromLastSession,
  type PresetId,
} from './dateRange/dateRangeUtils';
export {
  detectDataUnit,
  collectSessionDates,
  collectVolumeRecords,
  defaultCanonicalsByLift,
  visibleLiftTypes,
} from './model/modelSelectors';
export {
  selectDiagnosticVariants,
  summarizeEffects,
  type DiagnosticVariant,
  type EffectSummary,
} from './diagnostics/diagnosticsSelectors';
export { formatEffect, formatAddlWtOffset } from './diagnostics/diagnosticsUtils';
export { formatExerciseDisplayName, buildExerciseDisplayNameIndex } from './exerciseUtils';
