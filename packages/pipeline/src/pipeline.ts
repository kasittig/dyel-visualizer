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

export function runPipeline(
  raw: RawInput[],
  specs: DatasetSpec[],
  athlete: AthleteContext,
  ui: RenderParams
): PipelineResult {
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
  const { tagged, unknown: unkCanonicals } = tagRecords(resolved);
  const unknownExercises = [...new Set([...unkAliases, ...unkCanonicals])];
  const model = fitNormalizationModel(tagged, { minSamples: MIN_SAMPLES }, athlete);

  const deriverIds = new Set<string>([
    'e1rm',
    ...specs.map((s) => {
      return s.derive;
    }),
  ]);
  const pointsByDeriver = new Map(
    [...deriverIds].map((id) => {
      return [id, buildPoints(tagged, id)];
    })
  );
  const e1rmPoints = pointsByDeriver.get('e1rm')!;

  const labelGroupByDeriverIds = new Set<string>(
    specs
      .filter((s) => {
        return s.kind === 'series' && s.groupBy === 'label';
      })
      .map((s) => {
        return s.kind === 'series' ? s.derive : 'e1rm';
      })
  );
  const pointsByLabelByDeriver = new Map(
    [...labelGroupByDeriverIds].map((id) => {
      return [id, buildPointsByLabel(tagged, id)];
    })
  );

  const compositeDeriverIds = new Set<string>(
    specs
      .filter((s) => {
        return s.kind === 'composite';
      })
      .map((s) => {
        return s.derive;
      })
  );
  const addlWtCanonicals = new Set(Object.keys(model.addlWtOffset));
  const pointsByDeriverAdjusted = new Map(
    [...compositeDeriverIds].map((id) => {
      const original = pointsByDeriver.get(id) ?? buildPoints(tagged, id);
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
  const diagnostics = diagnose(
    e1rmPoints,
    model,
    effectsByCanonical,
    { tolerance: DIAGNOSTICS_TOLERANCE, staleDays: DIAGNOSTICS_STALE_DAYS },
    undefined
  );

  const datasets = Object.fromEntries(
    specs.map((s) => {
      const pts =
        s.kind === 'composite'
          ? pointsByDeriverAdjusted.get(s.derive)!
          : s.kind === 'series' && s.groupBy === 'label'
            ? pointsByLabelByDeriver.get(s.derive)!
            : pointsByDeriver.get(s.derive)!;
      return [s.id, buildDataset(pts, s, ui, model, athlete)];
    })
  );

  return { datasets, diagnostics, unknownExercises, unnormalized, parseErrors, model };
}
