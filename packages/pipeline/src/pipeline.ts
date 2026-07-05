import type { Point, SetRecord } from './types';
import type { RawInput, ParseContext } from './parse/parser';
import { ParseError, ParserRegistry } from './parse/parser';
import { csvParser } from './parse/csv';
import { freeformParser } from './parse/freeform/parser';
import type { TaggedSetRecord } from './tag/tag';
import { resolveCanonicalNames, tagRecords } from './tag/tag';
import { derivers } from './derive/derivers';
import type { NormalizationModel } from './derive/normalize';
import { fitNormalizationModel, normalizeE1rm } from './derive/normalize';
import type { AthleteContext } from './derive/athlete';
import type { DiagnosticsReport } from './analyze/diagnose';
import { diagnose } from './analyze/diagnose';
import type { DatasetSpec, RenderParams, RechartsRow } from './dataset/build';
import { buildDataset } from './dataset/build';

const MIN_SAMPLES = 1;
const DIAGNOSTICS_TOLERANCE = 0.05;
const DIAGNOSTICS_STALE_DAYS = 90;
const PARSE_CONTEXT: ParseContext = { fallback: 'lbs' };

export interface PipelineResult {
  datasets: Record<string, RechartsRow[]>;
  diagnostics: DiagnosticsReport;
  unknownExercises: string[];
  unnormalized: string[];
  parseErrors: ParseError[];
}

function buildPoints(tagged: TaggedSetRecord[], deriverId: string): Point[] {
  const deriver = derivers[deriverId];
  return [...Map.groupBy(tagged, (r) => `${r.date}::${r.canonical}`).values()].map((sets) => ({
    t: sets[0].date,
    v: deriver.derive(sets),
    series: sets[0].canonical,
    tags: sets[0].tags,
  }));
}

export function runPipeline(
  raw: RawInput[],
  specs: DatasetSpec[],
  athlete: AthleteContext,
  ui: RenderParams
): PipelineResult {
  const registry = new ParserRegistry();
  registry.registerMany([csvParser, freeformParser]);

  const parseErrors: ParseError[] = [];
  const records: SetRecord[] = [];

  for (const input of raw) {
    try {
      records.push(...registry.parse(input, PARSE_CONTEXT));
    } catch (err) {
      if (err instanceof ParseError) {
        parseErrors.push(err);
      } else {
        throw err;
      }
    }
  }

  const { resolved, unknown: unknownAliases } = resolveCanonicalNames(records);
  const { tagged, unknown: unknownCanonicals } = tagRecords(resolved);
  const unknownExercises = [...new Set([...unknownAliases, ...unknownCanonicals])];

  // Derive all active IDs in one pass, defaulting to 'e1rm'
  const deriverIds = new Set<string>([
    'e1rm',
    ...specs.map((s) => (s.kind === 'series' ? s.derive : 'e1rm')),
  ]);
  const pointsByDeriver = new Map([...deriverIds].map((id) => [id, buildPoints(tagged, id)]));
  const e1rmPoints = pointsByDeriver.get('e1rm')!;

  const model: NormalizationModel = fitNormalizationModel(tagged, { minSamples: MIN_SAMPLES });

  // Compute unnormalized canonical keys natively via the series group map
  const unnormalized = [...Map.groupBy(e1rmPoints, (p) => p.series)]
    .map(([, pts]) => pts.reduce((a, b) => (b.t > a.t ? b : a)))
    .filter((latest) => normalizeE1rm(latest.series, latest.v, model) === null)
    .map((latest) => latest.series);

  const effectsByCanonical = new Map(tagged.map((r) => [r.canonical, [...r.effects]]));

  const diagnostics = diagnose(e1rmPoints, model, effectsByCanonical, {
    tolerance: DIAGNOSTICS_TOLERANCE,
    staleDays: DIAGNOSTICS_STALE_DAYS,
  });

  // Construct charts via object-from-entries lookup transformation
  const datasets = Object.fromEntries(
    specs.map((s) => [
      s.id,
      buildDataset(
        (s.kind === 'series' ? pointsByDeriver.get(s.derive) : e1rmPoints)!,
        s,
        ui,
        model,
        athlete
      ),
    ])
  );

  return { datasets, diagnostics, unknownExercises, unnormalized, parseErrors };
}
