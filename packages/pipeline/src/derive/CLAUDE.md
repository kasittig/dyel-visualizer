# derive/ — tagged sets → Points, normalization model, athlete math

## derivers.ts — TaggedSetRecord[] → single value per (date, canonical)

    type SeriesDeriver = { id: string; derive(daySets: TaggedSetRecord[]): number };

| id      | definition                | multi-set collapse      |
| ------- | ------------------------- | ----------------------- |
| e1rm    | Epley: w \* (1 + reps/30) | best set (max over day) |
| tonnage | Σ w \* reps               | sum                     |
| top-set | max weight                | max                     |

Derivers iterate the day's records — multipliers were already expanded in
parse/; never re-multiply.

## normalize.ts — fit/apply split

    fitNormalizationModel(history, { minSamples }): NormalizationModel
    offsetAdjustRecords(records, model): TaggedSetRecord[]
    normalizeE1rm(canonical, e1rmKg, model): number | null
    projectToVariant(baselineE1rmKg, targetCanonical, model): number | null

- `NormalizationModel` is a SERIALIZABLE record (plain objects, no Maps):
  `baseline` (lift family → baseline canonical), `variantFactor`
  (canonical → { factor, n }), `addlWtOffset` (canonical → { offsetKg, n }).
- Fitting is deterministic arithmetic over tagged history — runs in-pipeline,
  produces no persisted artifact.
- `offsetAdjustRecords` (Design C): applies weight-space offset corrections to raw
  records' `weight` field per canonical, mirroring legacy's pre-derivation path. Used
  by pipeline.ts before building points for composite specs, so their e1RM derivations
  are based on already-corrected weights. Records without a fitted offset pass through
  unchanged. Must receive a fully-fit model (not partial, mid-fit state).
- `normalizeE1rm` and `projectToVariant`: pure factor operations (Design C supersedes
  Task 10b's e1RM-space approximation). `projectToVariant` has no production callers;
  known approximation limitation is that post-hoc offset application is unprincipled
  (offset is inherently per-set/weight-space).
- Baseline-only by design: variant→variant composes as variant→comp→variant.
  Do not add a variant→variant path.
- `null` = unfitted (n < minSamples) → caller excludes + surfaces for review.
  Never fall back to factor 1.0 silently.
- Fit estimation specifics are needs-design (port from legacy
  repCalculator.ts) — flag, don't invent.

## athlete.ts — UI state → context + scores

    wilks(totalKg, ctx): number
    dots(totalKg, ctx): number

- Bodyweight comes ONLY from UI entries — never from parsed logs.
- wilks/dots are pure polynomial evaluations; inputs in kg.
