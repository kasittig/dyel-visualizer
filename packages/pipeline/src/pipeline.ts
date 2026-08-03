import type { Point, SetRecord } from './types';
import type { RawInput, ParseContext } from './parse/parser';
import { ParseError, ParserRegistry } from './parse/parser';
import { csvParser } from './parse/csv';
import { freeformParser } from './parse/freeform/parser';
import type { TaggedSetRecord } from './tag/tag';
import { classifyAccessorySubtypes, tagRecordsByPrimaryEvidence } from './tag/tag';
import { parseExercise } from './tag/detect/parseExercise';
import { derivers, selectMaxEffortSet } from './derive/derivers';
import type { NormalizationModel } from './derive/normalize';
import {
  fitNormalizationModel,
  normalizeE1rm,
  offsetAdjustRecords,
  projectE1RMToDate,
} from './derive/normalize';
import type { AthleteContext } from './derive/athlete';
import type { DiagnosticsReport } from './analyze/diagnose';
import { diagnose } from './analyze/diagnose';
import type { DatasetSpec, RenderParams, RechartsRow } from './dataset/build';
import { buildDataset } from './dataset/build';

const PARSE_CONTEXT: ParseContext = { fallback: 'lbs' };

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
  points: PipelinePointStore;
  tagged: TaggedSetRecord[];
  athlete: AthleteContext;
}

export interface PointQueryOptions {
  groupBy?: 'canonical' | 'label';
  adjusted?: boolean;
}

export interface PipelinePointStore {
  get(deriverId: string, options?: PointQueryOptions): Point[];
  has(deriverId: string): boolean;
}

export function createPipelinePointStore({
  canonical = new Map(),
  label = canonical,
  adjustedCanonical = canonical,
  adjustedLabel = label,
}: {
  canonical?: Map<string, Point[]>;
  label?: Map<string, Point[]>;
  adjustedCanonical?: Map<string, Point[]>;
  adjustedLabel?: Map<string, Point[]>;
} = {}): PipelinePointStore {
  return {
    get(deriverId, options) {
      const source = options?.adjusted
        ? options.groupBy === 'label'
          ? adjustedLabel
          : adjustedCanonical
        : options?.groupBy === 'label'
          ? label
          : canonical;
      return source.get(deriverId) ?? [];
    },
    has: (deriverId) => canonical.has(deriverId),
  };
}

function groupByDateAndCanonical(tagged: TaggedSetRecord[]): Map<string, TaggedSetRecord[]> {
  return Map.groupBy(tagged, (r) => `${r.date}::${r.canonical}`);
}

function groupByDateAndLabel(tagged: TaggedSetRecord[]): Map<string, TaggedSetRecord[]> {
  return Map.groupBy(tagged, (r) => `${r.date}::${r.meta?.rawExercise ?? r.canonical}`);
}

function buildPointsFromGroups(groups: Map<string, TaggedSetRecord[]>, deriverId: string): Point[] {
  const d = derivers[deriverId];
  return Array.from(groups.values()).flatMap((sets) => {
    const v = d.derive(sets);
    return v === null
      ? []
      : [{ t: sets[0].date, v, series: sets[0].canonical, tags: sets[0].tags }];
  });
}

function buildPointsByLabelFromGroups(
  groups: Map<string, TaggedSetRecord[]>,
  deriverId: string
): Point[] {
  const d = derivers[deriverId];
  return Array.from(groups.values()).flatMap((sets) => {
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

// Projects a canonical's day-level max-effort e1RM trend forward to `now`, rather than
// returning the raw all-time best, so a stale PR in one stance can't outrank current
// strength in the other when comparing stances (see tagCompetitionDeadliftStance). Uses
// `e1rm-max-effort` (drops any day without a qualifying set of 5 reps or fewer, including
// all-speed-work days via `isSpeedWork` — 2+ sets with no RPE), matching how the rest of the app treats comp-lift day-level data for legacy
// parity (see derive/CLAUDE.md) — note this means a lifter who never logs RPE at all will have
// most of their multi-set training days excluded from this specific comparison, leaving only
// their single-set max-attempt days to determine the trend.
function projectedE1RMForCanonical(
  compTagged: TaggedSetRecord[],
  canonical: string,
  now: number
): number | null {
  const dayGroups = Map.groupBy(
    compTagged.filter((r) => r.canonical === canonical),
    (r) => r.date
  );
  const points = Array.from(dayGroups.values())
    .map((daySets) => ({ t: daySets[0].date, v: derivers['e1rm-max-effort'].derive(daySets) }))
    .filter((p): p is { t: number; v: number } => p.v !== null);
  return points.length ? projectE1RMToDate(points, now) : null;
}

function tagCompetitionDeadliftStance(
  compTagged: TaggedSetRecord[],
  now: number
): TaggedSetRecord[] {
  const sumo = projectedE1RMForCanonical(compTagged, 'deadlift-sumo', now);
  const conv = projectedE1RMForCanonical(compTagged, 'deadlift', now);
  const stronger = sumo !== null && conv !== null && sumo > conv ? 'sumo' : 'conventional';

  return compTagged.map((r) => {
    if (!r.canonical.startsWith('deadlift')) {
      return r;
    }
    const ex = parseExercise(r.meta?.rawExercise ?? r.canonical);
    if (ex.stance !== stronger) {
      return r;
    }
    return { ...r, tags: new Set([...r.tags, 'competition']) };
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

  const parseErrors: ParseError[] = [];
  const records: SetRecord[] = [];

  for (const input of raw) {
    const parsed = registry.parseResult(input, PARSE_CONTEXT);
    records.push(...parsed.records);
    parseErrors.push(...parsed.errors);
  }

  const {
    tagged: historyTagged,
    primaryTagged: rawCompTagged,
    unknown: unknownExercises,
  } = tagRecordsByPrimaryEvidence(records);
  // The athlete's stronger deadlift stance (sumo vs. conventional) is derived automatically
  // from their own e1RM data, projected forward to `now` so a stale PR in one stance can't
  // outrank current strength in the other, never supplied externally — see
  // tagCompetitionDeadliftStance. Every downstream consumer of deadlift records' tags
  // (fitNormalizationModel, tagged, point store, etc.) must see the patched tags, so this
  // runs before any of them.
  const compTagged = tagCompetitionDeadliftStance(rawCompTagged, timestamp);
  let primaryIndex = 0;
  const tagged = classifyAccessorySubtypes(
    historyTagged.map((record) =>
      record.tags.has('lift:accessory') ? record : compTagged[primaryIndex++]
    )
  );

  const model = fitNormalizationModel(compTagged, { minSamples: 1 });
  const allDeriverIds = Object.keys(derivers);

  // Points/diagnostics are built from the FULL tagged set (compTagged + accessoryTagged), not
  // compTagged alone, so the app's Accessories tab (which filters on `lift:accessory` via
  // conjugateChartSpecs) actually gets chart data instead of always resolving empty. Only the
  // normalization MODEL itself (above) stays scoped to compTagged — baseline/variant-factor
  // fitting only ever makes sense for the three comp lifts. Derivers are lift-type-agnostic
  // (pure weight/reps/rpe math), and `diagnose` already treats any canonical with no fitted
  // `variantFactor` (true for every accessory canonical) as `unassessed` rather than erroring.
  const canonicalGroups = groupByDateAndCanonical(tagged);
  const labelGroups = groupByDateAndLabel(tagged);
  const pointsByDeriver = new Map(
    allDeriverIds.map((id) => [id, buildPointsFromGroups(canonicalGroups, id)])
  );
  const pointsByLabelByDeriver = new Map(
    allDeriverIds.map((id) => [id, buildPointsByLabelFromGroups(labelGroups, id)])
  );

  const addlWtCanonicals = new Set(Object.keys(model.addlWtOffset));
  const adjustedRecords = addlWtCanonicals.size > 0 ? offsetAdjustRecords(tagged, model) : null;
  const adjustedCanonicalGroups = adjustedRecords ? groupByDateAndCanonical(adjustedRecords) : null;
  const adjustedLabelGroups = adjustedRecords ? groupByDateAndLabel(adjustedRecords) : null;

  const pointsByDeriverAdjusted = new Map(
    allDeriverIds.map((id) => {
      const original = pointsByDeriver.get(id)!;
      if (addlWtCanonicals.size === 0) {
        return [id, original];
      }
      const adjustedByKey = new Map(
        buildPointsFromGroups(adjustedCanonicalGroups!, id)
          .filter((p) => addlWtCanonicals.has(p.series))
          .map((p) => [`${p.t}::${p.series}`, p])
      );
      return [id, original.map((p) => adjustedByKey.get(`${p.t}::${p.series}`) ?? p)];
    })
  );

  const pointsByLabelByDeriverAdjusted = new Map(
    allDeriverIds.map((id) => {
      const original = pointsByLabelByDeriver.get(id)!;
      if (addlWtCanonicals.size === 0) {
        return [id, original];
      }
      return [id, buildPointsByLabelFromGroups(adjustedLabelGroups!, id)];
    })
  );
  const points = createPipelinePointStore({
    canonical: pointsByDeriver,
    label: pointsByLabelByDeriver,
    adjustedCanonical: pointsByDeriverAdjusted,
    adjustedLabel: pointsByLabelByDeriverAdjusted,
  });

  const unnormalized = Array.from(Map.groupBy(pointsByDeriver.get('e1rm')!, (p) => p.series))
    .map(([, pts]) => pts.reduce((a, b) => (b.t > a.t ? b : a)))
    .filter((latest) => normalizeE1rm(latest.series, latest.v, model) === null)
    .map((latest) => latest.series);

  const effectsByCanonical = new Map(tagged.map((r) => [r.canonical, [...r.effects]]));
  const displayNameLatest = new Map<string, { date: number; name: string }>();
  const canonicalByDisplayName = new Map<string, string>();

  for (const r of tagged) {
    canonicalByDisplayName.set(r.meta?.rawExercise ?? r.canonical, r.canonical);
    const existing = displayNameLatest.get(r.canonical);
    if (!existing || r.date > existing.date) {
      displayNameLatest.set(r.canonical, {
        date: r.date,
        name: r.meta?.rawExercise ?? r.canonical,
      });
    }
  }

  const displayNameByCanonical = new Map(Array.from(displayNameLatest, ([k, v]) => [k, v.name]));
  const baselineRangeByCanonical = new Map(
    tagged.flatMap((r) => (r.baselineRange ? [[r.canonical, r.baselineRange] as const] : []))
  );
  const maxEffortSetByPoint = new Map<string, TaggedSetRecord>(
    Array.from(canonicalGroups.values()).flatMap((sets) => {
      const best = selectMaxEffortSet(sets);
      return best ? [[`${sets[0].canonical}::${sets[0].date}`, best] as const] : [];
    })
  );

  const diagnostics = diagnose(
    pointsByDeriver.get('e1rm-max-effort')!,
    model,
    effectsByCanonical,
    { tolerance: 0.05, staleDays: 90 },
    timestamp,
    displayNameByCanonical,
    baselineRangeByCanonical,
    maxEffortSetByPoint
  );
  diagnostics.unassessed.push(
    ...unknownExercises.map((displayName) => ({
      canonical: canonicalByDisplayName.get(displayName) ?? displayName,
      displayName,
      lift: null,
      reason: 'missing-lift' as const,
    }))
  );

  return {
    model,
    diagnostics,
    unknownExercises,
    unnormalized,
    parseErrors,
    points,
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
      const pts = pipelineModel.points.get(s.derive, {
        adjusted:
          s.kind === 'composite' || (s.kind === 'series' && s.groupBy === 'label' && !!s.normalize),
        groupBy: s.kind === 'series' && s.groupBy === 'label' ? 'label' : 'canonical',
      });
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
  return {
    datasets: buildDatasetsFromModel(pipelineModel, specs, ui),
    diagnostics: pipelineModel.diagnostics,
    unknownExercises: pipelineModel.unknownExercises,
    unnormalized: pipelineModel.unnormalized,
    parseErrors: pipelineModel.parseErrors,
    model: pipelineModel.model,
  };
}
