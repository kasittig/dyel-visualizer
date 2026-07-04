import type { Point, SetRecord } from './types';
import type { RawInput, ParseContext } from './parse/parser';
import { ParseError, ParserRegistry } from './parse/parser';
import { csvParser } from './parse/csv';
import { freeformParser } from './parse/freeform/parser';
import type { ExerciseAliasMap, ExerciseTagMap, TaggedSetRecord } from './tag/tag';
import { resolveCanonicalNames, tagRecords } from './tag/tag';
import { derivers } from './derive/derivers';
import type { NormalizationModel } from './derive/normalize';
import { fitNormalizationModel, normalizeE1rm } from './derive/normalize';
import type { AthleteContext } from './derive/athlete';
import type { DiagnosticsReport } from './analyze/diagnose';
import { diagnose } from './analyze/diagnose';
import type { DatasetSpec, RenderParams, RechartsRow } from './dataset/build';
import { buildDataset } from './dataset/build';
import exerciseAliasesJson from './tag/exercise-aliases.json';
import exerciseMapJson from './tag/exercise-map.json';

const exerciseAliases = exerciseAliasesJson as ExerciseAliasMap;
const exerciseMap = exerciseMapJson as ExerciseTagMap;

// DESIGN FLAG (needs-design: "Fit specifics" / "Diagnostics thresholds" in DESIGN.md):
// neither a minSamples default nor tolerance/staleDays defaults exist anywhere upstream —
// derive/normalize.ts and analyze/diagnose.ts both require callers to supply them explicitly
// rather than inventing a default internally. As the top-level caller, pipeline.ts must pick
// concrete values; these match the ones already exercised in this package's own test suites.
// Flag for reviewer sign-off if these should change.
const MIN_SAMPLES = 3;
const DIAGNOSTICS_TOLERANCE = 0.05;
const DIAGNOSTICS_STALE_DAYS = 30;

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
  const groups = Map.groupBy(tagged, (r) => `${r.date}::${r.canonical}`);
  return [...groups.values()].map((sets) => ({
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
      if (!(err instanceof ParseError)) {
        throw err;
      }
      parseErrors.push(err);
    }
  }

  const { resolved, unknown: unknownAliases } = resolveCanonicalNames(records, exerciseAliases);
  const { tagged, unknown: unknownCanonicals } = tagRecords(resolved, exerciseMap);
  const unknownExercises = [...new Set([...unknownAliases, ...unknownCanonicals])];

  const deriverIds = new Set<string>(['e1rm']);
  specs.forEach((s) => {
    if (s.kind === 'series') {
      deriverIds.add(s.derive);
    }
  });
  const pointsByDeriver = new Map([...deriverIds].map((id) => [id, buildPoints(tagged, id)]));
  const e1rmPoints = pointsByDeriver.get('e1rm')!;

  const model: NormalizationModel = fitNormalizationModel(tagged, { minSamples: MIN_SAMPLES });

  const latestBySeries = new Map(
    [...Map.groupBy(e1rmPoints, (p) => p.series)].map(([series, pts]) => [
      series,
      pts.reduce((a, b) => (b.t > a.t ? b : a)),
    ])
  );
  const unnormalized = [...latestBySeries]
    .filter(([canonical, latest]) => normalizeE1rm(canonical, latest.v, model) === null)
    .map(([canonical]) => canonical);

  const diagnostics = diagnose(e1rmPoints, model, exerciseMap, {
    tolerance: DIAGNOSTICS_TOLERANCE,
    staleDays: DIAGNOSTICS_STALE_DAYS,
  });

  const datasets: Record<string, RechartsRow[]> = {};
  specs.forEach((spec) => {
    const points = (spec.kind === 'series' ? pointsByDeriver.get(spec.derive) : e1rmPoints)!;
    datasets[spec.id] = buildDataset(points, spec, ui, model, athlete);
  });

  return { datasets, diagnostics, unknownExercises, unnormalized, parseErrors };
}
