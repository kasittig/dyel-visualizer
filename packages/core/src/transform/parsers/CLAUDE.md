# transform/parsers/

Row- and field-level parsing helpers, consumed by `../parseConjugateData.ts` and `../validateSheetCsv.ts`.

## Files

- **`findCol.ts`** — `findCol(row, keyword)` matches a `RawRow` column by prefix (e.g. `"weight"` matches `"weight (lbs)"`).
- **`detectWeightUnit.ts`** — Reads the weight unit from a `weight (lbs)` / `weight (kg)` style column header (not from the values). Returns `null` if no unit is annotated anywhere.
- **`nameToExercise.ts`** — `nameToExercise(name)` converts a free-text exercise name into a `ConjugateExercise`, running each of the `types/detectors.ts` detector arrays (`BAR_DETECTORS`, `STANCE_DETECTORS`, `EQUIPMENT_DETECTORS`, `TYPE_DETECTORS`) in order; unrecognized exercises fall through to `'accessory'`.
- **`parseSession.ts`** — `parseSession(row)` turns a `RawRow` into a `RawSession` (a `TrainingSession` with `unit: LiftUnits | null`), computing `e1rm` via `calcE1RM` and reading the unit via `detectWeightUnit`.

## Key invariants

The detector arrays consumed by `nameToExercise.ts` now live in `../../types/detectors.ts` (shared with other consumers) and are ordered by specificity — earlier entries win. Adding a new keyword must respect this order to avoid shadowing existing matches.
