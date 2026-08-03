export type { Unit, SetRecord, Point, TagQuery } from './types';
export type { RawInput, ParseContext, ParseResult, Parser } from './parse/parser';
export { ParseError, resolveUnit, ParserRegistry } from './parse/parser';
export { csvParser } from './parse/csv';
export {
  freeformParser,
  parseFreeformText,
  parseFreeformTextResult,
} from './parse/freeform/parser';
export type { TaggedSetRecord } from './tag/tag';
export {
  tagRecords,
  resolveCanonicalNames,
  matches,
  classifyExerciseName,
  classifyAccessorySubtypes,
  buildAccessoryTaggedRecords,
  tagRecordsByPrimaryEvidence,
} from './tag/tag';
export type {
  ConjugateBar,
  ConjugateStance,
  ConjugateEquipment,
  ConjugateAddlWt,
  LiftType,
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
export type { AthleteContext } from './derive/athlete';
export { wilks, dots } from './derive/athlete';
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
export type {
  PipelineResult,
  PipelineModel,
  PipelinePointStore,
  PointQueryOptions,
} from './pipeline';
export {
  runPipeline,
  runPipelineModel,
  buildDatasetsFromModel,
  createPipelinePointStore,
} from './pipeline';
