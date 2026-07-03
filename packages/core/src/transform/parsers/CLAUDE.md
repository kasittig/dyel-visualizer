# transform/parsers/

Row- and field-level parsing helpers, consumed by `../parseConjugateData.ts`, `../parseTextData.ts`, `../validateSheetCsv.ts`, and `../validateTextData.ts`.

## Files

- **`findCol.ts`** — `findCol(row, keyword)` matches a `RawRow` column by prefix (e.g. `"weight"` matches `"weight (lbs)"`).
- **`detectWeightUnit.ts`** — Reads the weight unit from a `weight (lbs)` / `weight (kg)` style column header (not from the values). Returns `null` if no unit is annotated anywhere.
- **`nameToExercise.ts`** — `nameToExercise(name)` converts a free-text exercise name into a `ConjugateExercise`, running each of the `types/detectors.ts` detector arrays (`BAR_DETECTORS`, `STANCE_DETECTORS`, `EQUIPMENT_DETECTORS`, `TYPE_DETECTORS`) in order; unrecognized exercises fall through to `'accessory'`.
- **`parseSessionFields.ts`** — `parseSessionDate(row)` / `parseSessionRpe(row)`: date and RPE parsing shared by `parseSession.ts`.
- **`buildTrainingSession.ts`** — `buildTrainingSession(base, weight, reps)` validates a weight/reps pair (`isNaN`/`reps <= 0`) and builds the resulting `TrainingSession` via `calcE1RM`; used by `parseSession.ts`.
- **`parseSession.ts`** — `parseSession(row, units)` turns a `RawRow` into a single `TrainingSession | null` from literal `weight`/`reps` columns, via `buildTrainingSession`.
- **`dateToken.ts`** — `extractDateToken(line)` scans a whole pasted line (not per-whitespace-token) for the first date-shaped substring — ISO (`YYYY-MM-DD`), slash (`M/D[/YYYY]`), or month-name (`Mon D[, YYYY]` / `D Mon[, YYYY]`), case-insensitive, abbreviated or full month names — and normalizes it to `YYYY-MM-DD`. A missing year defaults to the current calendar year. Returns `{ dateStr, remainder }`; `remainder` has the matched substring removed (or is the original line if nothing matched). Hand-rolled rather than pulling in a date-parsing library, since `@dyel/core` ships dependency-free.
- **`textLineToRow.ts`** — `textLineToRow(line)` adapts a single pasted text line into a `RawRow`, using the same column-key convention as CSV headers (unit lives in the key, e.g. `"weight (lbs)"`) so the rest of this directory's row-level logic works unchanged. First extracts an optional date via `dateToken.ts` into the `date` key (read by `parseSessionFields.ts`'s `parseSessionDate`), then tries the sets-by-reps grammar (`"<exercise> [-] <sets>x<reps> @ <weight><unit>"`), falling back to the plain weight/reps grammar (`"<exercise> <weight><unit> x<reps>"`, reps optional, default 1). Returns `null` if none match.
- **`validateRow.ts`** — `validateRow(row)` runs the weight/reps/RPE checks shared by `../validateSheetCsv.ts` and `../validateTextData.ts` on a single `RawRow`, returning `{problems, warnings, sessionsInRow}`. Exercise-name-empty and date-string validity checks stay in each caller since CSV and text sources diverge there (CSV's raw `date` cell needs its own `isNaN(new Date(...))` check; text's `date` field, when present, was already validated/normalized by `textLineToRow`/`extractDateToken`).

## Key invariants

The detector arrays consumed by `nameToExercise.ts` now live in `../../types/detectors.ts` (shared with other consumers) and are ordered by specificity — earlier entries win. Adding a new keyword must respect this order to avoid shadowing existing matches.
