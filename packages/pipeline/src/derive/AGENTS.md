# derive/ — tagged sets → Points, normalization model, athlete math

## dayContext.ts — parsed records → daily bodyweight, notes, and findings

    deriveDayContexts(records): DayContext[]

- Groups records by UTC calendar date and preserves the first-seen order of dates.
- Reads normalized kilograms only from `meta.bodyweight`; raw bodyweight audit metadata is never
  changed. A single distinct value becomes `bodyweightKg`; conflicts leave it `null` and produce a
  `conflicting-bodyweights` finding containing the distinct values in source order.
- Deduplicates exact nonempty `meta.notes` strings in source order. It does not interpret notes or
  carry either kind of context between dates.

## derivers.ts — TaggedSetRecord[] → single value per (date, canonical)

    type SeriesDeriver = { id: string; derive(daySets: TaggedSetRecord[]): number | null };

| id              | definition                | multi-set collapse                                                                                                                                                                                       |
| --------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| e1rm            | Epley: w \* (1 + reps/30) | best non-speed-work set (max over day); falls back to speed-work sets if the day has none — never excludes a day                                                                                         |
| e1rm-max-effort | Epley: w \* (1 + reps/30) | best non-speed-work set of 5 reps or fewer (max over day); returns `null` (day excluded, not zero-filled) if the day has no qualifying effort sets, mirroring legacy's day-level max-effort/volume split |
| tonnage         | Σ w \* reps               | sum                                                                                                                                                                                                      |
| top-set         | max weight                | max                                                                                                                                                                                                      |

`isSpeedWork(s)` (exported from this file) classifies a set as speed-work when it has no
RPE and belongs to a 2+-set day (`meta.sets >= 2`) — an attached RPE always overrides,
since the lifter explicitly rated the effort. `e1rm` and `e1rm-max-effort` share this
classification but differ in what happens when a whole day is speed-work-only: `e1rm`
falls back to deriving from the speed-work sets anyway (never drops a day); `e1rm-max-effort`
returns `null` for that day instead (caller excludes it). Sets above 5 reps are also excluded
from `e1rm-max-effort`, even when they have an explicit RPE. Use `e1rm` for series that must
never drop a day (this includes accessory lift-type series, since accessory logging is
almost always multi-set/no-RPE and the max-effort/speed-work split has no accessory
equivalent); use `e1rm-max-effort` where day-level parity with legacy's max-effort-only
fitting/rendering matters for a true comp lift (squat/bench/deadlift — see
`conjugateChartSpecs.ts`, which branches on `liftType` for exactly this reason).

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
- `fitNormalizationModel` self-filters each canonical's records to non-speed-work sets
  (via `isSpeedWork`, same classifier as `e1rm` deriver); if a canonical has zero effort
  sets, falls back to its full record set, mirroring `e1rm`'s pattern. No pipeline-wide
  pre-filter applied — fitting is self-protecting against speed-work-only canonicals.
- Fit estimation specifics are needs-design (port from legacy
  repCalculator.ts) — flag, don't invent.

## athlete.ts — UI state → context + scores

    wilks(totalKg, ctx): number
    dots(totalKg, ctx): number

- Bodyweight comes ONLY from UI entries — never from parsed logs.
- wilks/dots are pure polynomial evaluations; inputs in kg.
