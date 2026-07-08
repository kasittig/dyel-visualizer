import type { Point, SetRecord } from './types';
import type { RawInput, ParseContext } from './parse/parser';
import { ParseError, ParserRegistry } from './parse/parser';
import { csvParser } from './parse/csv';
import { freeformParser } from './parse/freeform/parser';
import type { TaggedSetRecord } from './tag/tag';
import { resolveCanonicalNames, tagRecords } from './tag/tag';
import { derivers } from './derive/derivers';
import type { NormalizationModel } from './derive/normalize';
import { fitNormalizationModel, normalizeE1rm, offsetAdjustRecords } from './derive/normalize';
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
  model: NormalizationModel;
}

function buildPoints(tagged: TaggedSetRecord[], deriverId: string): Point[] {
  const deriver = derivers[deriverId];
  return [...Map.groupBy(tagged, (r) => `${r.date}::${r.canonical}`).values()].flatMap((sets) => {
    const v = deriver.derive(sets);
    return v === null
      ? []
      : [{ t: sets[0].date, v, series: sets[0].canonical, tags: sets[0].tags }];
  });
}

function buildPointsByLabel(tagged: TaggedSetRecord[], deriverId: string): Point[] {
  const deriver = derivers[deriverId];
  return [
    ...Map.groupBy(tagged, (r) => `${r.date}::${r.meta?.rawExercise ?? r.canonical}`).values(),
  ].flatMap((sets) => {
    const v = deriver.derive(sets);
    return v === null
      ? []
      : [
          {
            t: sets[0].date,
            v,
            series: sets[0].meta?.rawExercise ?? sets[0].canonical,
            tags: sets[0].tags,
          },
        ];
  });
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

  // Fit model first, before building any points (needed for offset adjustment)
  const model: NormalizationModel = fitNormalizationModel(
    tagged,
    { minSamples: MIN_SAMPLES },
    athlete
  );

  // Derive all active IDs in one pass, defaulting to 'e1rm'
  const deriverIds = new Set<string>(['e1rm', ...specs.map((s) => s.derive)]);
  const pointsByDeriver = new Map([...deriverIds].map((id) => [id, buildPoints(tagged, id)]));
  const e1rmPoints = pointsByDeriver.get('e1rm')!;

  // Compute deriver IDs needed specifically by groupBy: 'label' specs (avoid wasted work if none exist)
  const labelGroupByDeriverIds = new Set<string>(
    specs
      .filter((s) => s.kind === 'series' && s.groupBy === 'label')
      .map((s) => (s.kind === 'series' ? s.derive : 'e1rm'))
  );
  const pointsByLabelByDeriver = new Map(
    [...labelGroupByDeriverIds].map((id) => [id, buildPointsByLabel(tagged, id)])
  );

  // Design C: Compute deriver IDs needed specifically by CompositeSpecs, build offset-adjusted
  // records and their points (composite specs consume pre-corrected e1RM values derived from
  // weight-space-adjusted raw weights; series specs use raw uncorrected points as before).
  const compositeDeriverIds = new Set<string>(
    specs.filter((s) => s.kind === 'composite').map((s) => s.derive)
  );
  const offsetAdjustedTagged = offsetAdjustRecords(tagged, model);
  // Only canonicals with a fitted addlWtOffset can possibly differ between the raw and
  // offset-adjusted derivations (offsetAdjustRecords is a documented identity/no-op pass-through
  // for every other canonical). Rather than trusting a second independent buildPoints() pass to
  // reproduce byte-identical output for those untouched canonicals, splice in the freshly-derived
  // points ONLY for the canonicals that actually have an offset, and reuse the already-computed
  // (and already-correct) pointsByDeriver points verbatim for everything else. This makes the
  // "no-op for non-addlWt families" guarantee hold by construction instead of by coincidence,
  // eliminating an entire class of composite-spec regressions (e.g. squat, which has zero addlWt
  // variants in real data, was silently regressing off pixel-parity before this change even
  // though its own records were never touched by an offset).
  const addlWtCanonicals = new Set(Object.keys(model.addlWtOffset));
  const pointsByDeriverAdjusted = new Map(
    [...compositeDeriverIds].map((id) => {
      const original = pointsByDeriver.get(id) ?? buildPoints(tagged, id);
      if (addlWtCanonicals.size === 0) {
        return [id, original];
      }
      const adjustedByKey = new Map(
        buildPoints(offsetAdjustedTagged, id)
          .filter((p) => addlWtCanonicals.has(p.series))
          .map((p) => [`${p.t}::${p.series}`, p])
      );
      return [id, original.map((p) => adjustedByKey.get(`${p.t}::${p.series}`) ?? p)];
    })
  );

  // Compute unnormalized canonical keys natively via the series group map
  const unnormalized = [...Map.groupBy(e1rmPoints, (p) => p.series)]
    .map(([, pts]) => pts.reduce((a, b) => (b.t > a.t ? b : a)))
    .filter((latest) => normalizeE1rm(latest.series, latest.v, model) === null)
    .map((latest) => latest.series);

  const effectsByCanonical = new Map(tagged.map((r) => [r.canonical, [...r.effects]]));

  const diagnostics = diagnose(
    e1rmPoints,
    model,
    effectsByCanonical,
    {
      tolerance: DIAGNOSTICS_TOLERANCE,
      staleDays: DIAGNOSTICS_STALE_DAYS,
    },
    undefined
  );

  // Construct charts via object-from-entries lookup transformation
  const datasets = Object.fromEntries(
    specs.map((s) => [
      s.id,
      buildDataset(
        s.kind === 'composite'
          ? pointsByDeriverAdjusted.get(s.derive)!
          : s.kind === 'series' && s.groupBy === 'label'
            ? pointsByLabelByDeriver.get(s.derive)!
            : pointsByDeriver.get(s.derive)!,
        s,
        ui,
        model,
        athlete
      ),
    ])
  );

  return { datasets, diagnostics, unknownExercises, unnormalized, parseErrors, model };
}
