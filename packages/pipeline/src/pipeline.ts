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

const MIN_SAMPLES = 1,
  DIAGNOSTICS_TOLERANCE = 0.05,
  DIAGNOSTICS_STALE_DAYS = 90,
  PARSE_CONTEXT: ParseContext = { fallback: 'lbs' };

export interface PipelineResult {
  datasets: Record<string, RechartsRow[]>;
  diagnostics: DiagnosticsReport;
  unknownExercises: string[];
  unnormalized: string[];
  parseErrors: ParseError[];
  model: NormalizationModel;
}

export interface PipelineModel {
  model: NormalizationModel;
  diagnostics: DiagnosticsReport;
  unknownExercises: string[];
  unnormalized: string[];
  parseErrors: ParseError[];
  pointsByDeriver: Map<string, Point[]>;
  pointsByLabelByDeriver: Map<string, Point[]>;
  pointsByDeriverAdjusted: Map<string, Point[]>;
  // Tagged, canonicalized set records prior to any deriver aggregation -- exposed for
  // callers that need per-set detail (sets/reps/weight/rpe) rather than a day-collapsed
  // Point, e.g. building a per-variation/per-date "best set" lookup for chart tooltips.
  tagged: TaggedSetRecord[];
  athlete: AthleteContext;
}

function buildPoints(tagged: TaggedSetRecord[], deriverId: string): Point[] {
  const d = derivers[deriverId];
  return [
    ...Map.groupBy(tagged, (r) => {
      return `${r.date}::${r.canonical}`;
    }).values(),
  ].flatMap((sets) => {
    const v = d.derive(sets);
    return v === null
      ? []
      : [{ t: sets[0].date, v, series: sets[0].canonical, tags: sets[0].tags }];
  });
}

function buildPointsByLabel(tagged: TaggedSetRecord[], deriverId: string): Point[] {
  const d = derivers[deriverId];
  return [
    ...Map.groupBy(tagged, (r) => {
      return `${r.date}::${r.meta?.rawExercise ?? r.canonical}`;
    }).values(),
  ].flatMap((sets) => {
    const v = d.derive(sets);
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

export function runPipelineModel(
  raw: RawInput[],
  athlete: AthleteContext,
  now?: number
): PipelineModel {
  const timestamp = now ?? Date.now();
  const registry = new ParserRegistry();
  registry.registerMany([csvParser, freeformParser]);
  const parseErrors: ParseError[] = [],
    records: SetRecord[] = [];

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

  const { resolved, unknown: unkAliases } = resolveCanonicalNames(records);
  const { tagged, unknown: unkCanonicals } = tagRecords(resolved, athlete.deadliftStance);
  const unknownExercises = [...new Set([...unkAliases, ...unkCanonicals])];
  const fitInput = tagged.filter((record) => {
    return record.sets === undefined || record.sets === 1 || record.rpe !== undefined;
  });
  const model = fitNormalizationModel(fitInput, { minSamples: MIN_SAMPLES }, athlete);

  // Build points for ALL registered deriver ids
  const allDeriverIds = Object.keys(derivers);
  const pointsByDeriver = new Map(
    allDeriverIds.map((id) => {
      return [id, buildPoints(tagged, id)];
    })
  );
  const e1rmPoints = pointsByDeriver.get('e1rm')!;

  const pointsByLabelByDeriver = new Map(
    allDeriverIds.map((id) => {
      return [id, buildPointsByLabel(tagged, id)];
    })
  );

  const addlWtCanonicals = new Set(Object.keys(model.addlWtOffset));
  const pointsByDeriverAdjusted = new Map(
    allDeriverIds.map((id) => {
      const original = pointsByDeriver.get(id)!;
      if (addlWtCanonicals.size === 0) {
        return [id, original];
      }
      const adjustedByKey = new Map(
        buildPoints(offsetAdjustRecords(tagged, model), id)
          .filter((p) => {
            return addlWtCanonicals.has(p.series);
          })
          .map((p) => {
            return [`${p.t}::${p.series}`, p];
          })
      );
      return [
        id,
        original.map((p) => {
          return adjustedByKey.get(`${p.t}::${p.series}`) ?? p;
        }),
      ];
    })
  );

  const unnormalized = [
    ...Map.groupBy(e1rmPoints, (p) => {
      return p.series;
    }),
  ]
    .map(([, pts]) => {
      return pts.reduce((a, b) => {
        return b.t > a.t ? b : a;
      });
    })
    .filter((latest) => {
      return normalizeE1rm(latest.series, latest.v, model) === null;
    })
    .map((latest) => {
      return latest.series;
    });

  const effectsByCanonical = new Map(
    tagged.map((r) => {
      return [r.canonical, [...r.effects]];
    })
  );
  // Most-recent-by-date wins per canonical — a variant's logged label can drift over
  // time (e.g. sheet-entry rewording), so the display name should track current usage.
  const displayNameLatest = new Map<string, { date: number; name: string }>();
  for (const r of tagged) {
    const existing = displayNameLatest.get(r.canonical);
    if (!existing || r.date > existing.date) {
      displayNameLatest.set(r.canonical, {
        date: r.date,
        name: r.meta?.rawExercise ?? r.canonical,
      });
    }
  }
  const displayNameByCanonical = new Map(
    [...displayNameLatest].map(([canonical, { name }]) => [canonical, name])
  );
  const baselineRangeByCanonical = new Map(
    tagged.flatMap((r) => (r.baselineRange ? [[r.canonical, r.baselineRange] as const] : []))
  );
  const diagnostics = diagnose(
    e1rmPoints,
    model,
    effectsByCanonical,
    { tolerance: DIAGNOSTICS_TOLERANCE, staleDays: DIAGNOSTICS_STALE_DAYS },
    timestamp,
    displayNameByCanonical,
    baselineRangeByCanonical
  );

  return {
    model,
    diagnostics,
    unknownExercises,
    unnormalized,
    parseErrors,
    pointsByDeriver,
    pointsByLabelByDeriver,
    pointsByDeriverAdjusted,
    tagged,
    athlete,
  };
}

export function buildDatasetsFromModel(
  pipelineModel: PipelineModel,
  specs: DatasetSpec[],
  ui: RenderParams
): Record<string, RechartsRow[]> {
  return Object.fromEntries(
    specs.map((s) => {
      const pts =
        s.kind === 'composite'
          ? pipelineModel.pointsByDeriverAdjusted.get(s.derive)!
          : s.kind === 'series' && s.groupBy === 'label'
            ? pipelineModel.pointsByLabelByDeriver.get(s.derive)!
            : pipelineModel.pointsByDeriver.get(s.derive)!;
      return [s.id, buildDataset(pts, s, ui, pipelineModel.model, pipelineModel.athlete)];
    })
  );
}

export function runPipeline(
  raw: RawInput[],
  specs: DatasetSpec[],
  athlete: AthleteContext,
  ui: RenderParams,
  now?: number
): PipelineResult {
  const timestamp = now ?? Date.now();
  const pipelineModel = runPipelineModel(raw, athlete, timestamp);
  const datasets = buildDatasetsFromModel(pipelineModel, specs, ui);
  return {
    datasets,
    diagnostics: pipelineModel.diagnostics,
    unknownExercises: pipelineModel.unknownExercises,
    unnormalized: pipelineModel.unnormalized,
    parseErrors: pipelineModel.parseErrors,
    model: pipelineModel.model,
  };
}
