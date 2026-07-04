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
    normalizeE1rm(canonical, e1rmKg, model): number | null
    projectToVariant(baselineE1rmKg, targetCanonical, model): number | null

- `NormalizationModel` is a SERIALIZABLE record (plain objects, no Maps):
  `baseline` (lift family → baseline canonical), `variantFactor`
  (canonical → { factor, n }), `addlWtOffset` ('addl:\*' tag → { offsetKg, n }).
- Fitting is deterministic arithmetic over tagged history — runs in-pipeline,
  produces no persisted artifact.
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
