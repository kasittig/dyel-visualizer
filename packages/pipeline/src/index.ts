export type { Unit, SetRecord, Point, TagQuery } from './types';
export type { RawInput, ParseContext, Parser } from './parse/parser';
export { ParseError, resolveUnit, ParserRegistry } from './parse/parser';
export { csvParser } from './parse/csv';
export { freeformParser, parseFreeformText } from './parse/freeform/parser';
export type { TaggedSetRecord } from './tag/tag';
export {
  tagRecords,
  resolveCanonicalNames,
  matches,
  facetsFromTags,
  facetFamilyKey,
  classifyExerciseName,
} from './tag/tag';
export type {
  ConjugateBar,
  ConjugateStance,
  ConjugateEquipment,
  ConjugateAddlWt,
} from './tag/detect/conjugate-types';
export {
  CONJUGATE_BARS,
  CONJUGATE_STANCES,
  CONJUGATE_EQUIPMENT,
  CONJUGATE_ADDL_WTS,
} from './tag/detect/conjugate-types';
export type { SeriesDeriver } from './derive/derivers';
export { derivers, isSpeedWork } from './derive/derivers';
export { calcE1RM, invertE1RM } from './derive/e1rm';
export type { NormalizationModel } from './derive/normalize';
export {
  fitNormalizationModel,
  normalizeE1rm,
  projectToVariant,
  offsetAdjustRecords,
  buildGridFromPoints,
  projectE1RMToDate,
} from './derive/normalize';
export type { AthleteContext, LiftMetrics } from './derive/athlete';
export { wilks, dots, computeStrengthScores } from './derive/athlete';
export type { DiagnosticsReport, VariantAssessment, Quality } from './analyze/diagnose';
export { diagnose } from './analyze/diagnose';
export type {
  DatasetSpec,
  SeriesSpec,
  CompositeSpec,
  RenderParams,
  RechartsRow,
  ChartPoint,
} from './dataset/build';
export { buildDataset } from './dataset/build';
export type { PipelineResult, PipelineModel } from './pipeline';
export { runPipeline, runPipelineModel, buildDatasetsFromModel } from './pipeline';
export { LINE_COLORS } from './utils/colors';
