export type { Unit, SetRecord, Point, TagQuery } from './types';
export type { RawInput, ParseContext, Parser } from './parse/parser';
export { ParseError, resolveUnit, ParserRegistry } from './parse/parser';
export { csvParser } from './parse/csv';
export { freeformParser, parseFreeformText } from './parse/freeform/parser';
export type { TaggedSetRecord } from './tag/tag';
export { tagRecords, resolveCanonicalNames, matches } from './tag/tag';
export type { SeriesDeriver } from './derive/derivers';
export { derivers } from './derive/derivers';
export { calcE1RM, invertE1RM } from './derive/e1rm';
export type { NormalizationModel } from './derive/normalize';
export {
  fitNormalizationModel,
  normalizeE1rm,
  projectToVariant,
  offsetAdjustRecords,
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
