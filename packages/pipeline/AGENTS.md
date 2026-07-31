# packages/pipeline

Import graph for the dyel pipeline: raw input in, chart-ready datasets + diagnostics out.
`src/types.ts` remains a flat, logic-free root that every other module imports from and
never redefines; the pipeline's actual orchestration logic (below) lives alongside it in
`src/pipeline.ts`, with each processing stage in its own subdirectory (each documented by
its own `AGENTS.md`).

## Files

- **`src/types.ts`** — `SetRecord` (post-parse, unit-normalized-to-kg log entry with an audit-trail `meta` bag), `Point` (a single plotted value with a canonical `series` id and a `ReadonlySet<string>` of tags), `TagQuery` (all/any/none filter shape), and `Unit` (`'lbs' | 'kg'`, used only at parse time — it does not appear on `SetRecord`). Contains ONLY type/interface declarations — no runtime logic, no default exports.
- **`src/pipeline.ts`** — the orchestrator. `runPipelineModel(raw, athlete, now?): PipelineModel` runs the full parse → tag → fit-normalization → derive-points → diagnose sequence once. `buildDatasetsFromModel(model, specs, ui)` turns a model into chart-ready rows without re-running the pipeline. `PipelineModel.points` is the single point-query boundary: `points.get(deriver, { groupBy, adjusted })`; canonical/label and adjusted variants remain precomputed internally. `PipelineModel.tagged` exposes per-set detail. The normalization model is fit from competition-lift records, while point data includes competition and accessory records.
- **`src/index.ts`** — the package's public export surface; every type/function meant for consumption outside `@dyel/pipeline` must be re-exported here (see the file itself for the current full list — types/parsers/tag helpers/derivers/normalization/athlete scoring/diagnostics/dataset building/pipeline orchestration).
- **Subdirectories**: `parse/` (raw input → `SetRecord[]`), `tag/` (`SetRecord[]` → `TaggedSetRecord[]`, canonicalization), `derive/` (tagged sets → `Point[]`, normalization model, athlete math), `analyze/` (normalization residuals → diagnostics), `dataset/` (`Point[]` + spec → `RechartsRow[]`) — each has its own `AGENTS.md`.

## Key invariants

- `SetRecord.weight` is always kg internally. Raw unit/weight before conversion live in `SetRecord.meta`, not as typed fields — unit handling is a parser concern, not a pipeline-types concern.
- `Point.tags` is a `ReadonlySet<string>`, not an array — callers must not assume order or mutate it.
- **`Point.series` normally holds a canonical exercise id (slug).** Narrow exception: when a `SeriesSpec`
  sets `groupBy: 'label'`, the pipeline builds points where `p.series` holds the raw logged
  exercise string (from `r.meta?.rawExercise`) instead of canonical, enabling charts to group by
  exact logged variant for per-string granularity. This is opt-in via spec; omitted `groupBy`
  preserves canonical grouping and all existing behavior.
- `TaggedSetRecord` (`SetRecord` + `canonical`/`tags`/`effects`/`baselineRange`) is defined in `src/tag/tag.ts`, not `types.ts` — it's a tag-stage output type, not a base type every stage shares.
