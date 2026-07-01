# types/

Shared domain types used across `extract/`, `transform/`, `load/`, and `utils/`.

## Files

- **`conjugate.ts`** — The core domain model: `ConjugateExercise`, `TrainingSession`, `ConjugateDataPair`, the `ConjugateBar`/`ConjugateStance`/`ConjugateEquipment`/`ConjugateAddlWt` enums (plus their `CONJUGATE_*` const arrays), `LiftType`, `PrimaryLift`, `EffectEnum`, `DeadliftStancePreference`, and `GroupedConjugatePairs`. Also defines `variantLabel(ex)` (human-readable variation suffix) and `familyKey(ex)` (groups exercises sharing type/bar/stance/equipment).
- **`detectors.ts`** — `BAR_DETECTORS`, `STANCE_DETECTORS`, `EQUIPMENT_DETECTORS`, `TYPE_DETECTORS`: ordered `[value, matcher]` arrays keyed off a lowercased name string + token set, plus the shared `Detector<T>` type. Consumed by `transform/parsers/nameToExercise.ts`.
- **`RawRow.ts`** — `RawRow` (`Record<string, string>`), the shape every row-level parser in `extract/` and `transform/parsers/` operates on.
- **`metrics.ts`** — `LiftMetrics` interface (dots/wilks/schwartzmalone scores and their percentiles), produced by `utils/math/metrics.ts`.

## Key invariant

The detector arrays in `detectors.ts` are ordered by specificity — earlier entries win. Adding a new keyword must respect this order to avoid shadowing existing matches.
