# transform/parsers/

Row- and field-level parsing helpers, consumed by `../parseConjugateData.ts` and `../validateSheetCsv.ts`.

## Files

- **`findCol.ts`** — `findCol(row, keyword)` matches a `RawRow` column by prefix (e.g. `"weight"` matches `"weight (lbs)"`).
- **`findRepMaxCols.ts`** — `findRepMaxCols(row)` finds columns matching `^\d+rm(\W|$)` (e.g. `"1rm"`, `"3rm (kg)"`) and returns `{ reps, value }` pairs.
- **`detectWeightUnit.ts`** — Reads the weight unit from a `weight (lbs)` / `weight (kg)` style column header, or from a rep-max header like `1rm (kg)` if no `weight` column exists (not from the values). Returns `null` if no unit is annotated anywhere.
- **`nameToExercise.ts`** — `nameToExercise(name)` converts a free-text exercise name into a `ConjugateExercise`, running each of the `types/detectors.ts` detector arrays (`BAR_DETECTORS`, `STANCE_DETECTORS`, `EQUIPMENT_DETECTORS`, `TYPE_DETECTORS`) in order; unrecognized exercises fall through to `'accessory'`.
- **`parseSessionFields.ts`** — `parseSessionDate(row)` / `parseSessionRpe(row)`: date and RPE parsing shared by `parseSession.ts` and `parseRepMaxSessions.ts`.
- **`parseSession.ts`** — `parseSession(row, units)` turns a `RawRow` into a single `TrainingSession | null` from literal `weight`/`reps` columns, computing `e1rm` via `calcE1RM`.
- **`parseRepMaxSessions.ts`** — `parseRepMaxSessions(row, units)` turns a `RawRow` with rep-max columns into `TrainingSession[]`, one per populated `NRM` cell (same date/rpe/sets across the row).
- **`parseSessions.ts`** — `parseSessions(row, units)`: the dispatcher used by `parseConjugateData.ts`. Prefers `parseRepMaxSessions` when the row has any populated rep-max columns, otherwise falls back to `parseSession`.

## Key invariants

The detector arrays consumed by `nameToExercise.ts` now live in `../../types/detectors.ts` (shared with other consumers) and are ordered by specificity — earlier entries win. Adding a new keyword must respect this order to avoid shadowing existing matches.

A row uses either the literal `weight`/`reps` format or the rep-max (`NRM`) format, never both — `parseSessions.ts` picks one per row and a row can expand into more than one `TrainingSession`.
