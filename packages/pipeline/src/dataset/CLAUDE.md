# dataset/ — Points + spec + UI params → RechartsRow[]

Specs are DATA (JSON shipped with the app). Adding a chart never touches
pipeline code. Long/tidy internally; pivot to wide RechartsRow only here,
at the very end.

## Contract

    function buildDataset(points, spec: DatasetSpec, ui: RenderParams,
                          model: NormalizationModel, athlete: AthleteContext): RechartsRow[]
    type DatasetSpec = SeriesSpec | CompositeSpec;
    type RechartsRow = { t: number; [column: string]: number };

## SeriesSpec

filter by TagQuery (tags + canonical ids) → derive per (date, series) →
pivot series to columns. Example: "e1RM per comp lift split by
variant" = include `any: ['lift:bench']`, derive e1rm, pivot by canonical.

**Opt-in label grouping:** When `groupBy: 'label'` is set, the caller must pass
points where `p.series` holds the raw logged exercise string (from `r.meta?.rawExercise`)
instead of the canonical slug. This creates one line per exact logged variant
(e.g., `"Bench (1 board)"` vs `"Bench (2 board)"` as distinct series), matching
legacy chart grouping granularity for charts requiring per-exact-variant detail
(e.g., `ConjugateCharts` variations). Default (omitted `groupBy`) preserves canonical
grouping and existing behavior.

## CompositeSpec (e.g. estimated total)

Per component (typically the three `lift:*` families):
derive e1rm → `normalizeE1rm` each point (null → EXCLUDE, don't zero-fill) →
per date take MAX normalized → CARRY FORWARD most recent value across dates
(indefinitely, v1) → SUM components → optional `post: 'wilks' | 'dots'`
(consumes AthleteContext). The total consumes ALL variants (normalized),
not just comp lifts. Wilks/DOTS charts are just the total + post transform.

## RenderParams (UI runtime)

`chips` AND-merge into each spec's TagQuery; `dateRange` filters.

## Boundaries

- Sibling of analyze/ — never import from it or export to it.
- Output values stay kg ('weight' axes) or raw scores; display-unit
  conversion is the app's job.
- Flag, don't decide: carry-forward staleness policy.
