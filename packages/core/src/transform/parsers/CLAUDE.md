# transform/parsers/

Row- and field-level parsing helpers, consumed by `../parseConjugateData.ts`, `../parseTextData.ts`, and `../validateSheetCsv.ts`.

## Files

- **`repMaxToken.ts`** — Shared "`N` followed by `rm`" token definition (`REP_MAX_TOKEN_SRC`, `REP_MAX_RE`). Single source of truth for what counts as a rep-max marker, consumed by `findRepMaxCols.ts`, `detectWeightUnit.ts`, and `textLineToRow.ts`.
- **`findCol.ts`** — `findCol(row, keyword)` matches a `RawRow` column by prefix (e.g. `"weight"` matches `"weight (lbs)"`).
- **`findRepMaxCols.ts`** — `findRepMaxCols(row)` finds columns matching `REP_MAX_RE` (e.g. `"1rm"`, `"3rm (kg)"`) and returns `{ reps, value }` pairs.
- **`detectWeightUnit.ts`** — Reads the weight unit from a `weight (lbs)` / `weight (kg)` style column header, or from a rep-max header like `1rm (kg)` (via `REP_MAX_RE`) if no `weight` column exists (not from the values). Returns `null` if no unit is annotated anywhere.
- **`nameToExercise.ts`** — `nameToExercise(name)` converts a free-text exercise name into a `ConjugateExercise`, running each of the `types/detectors.ts` detector arrays (`BAR_DETECTORS`, `STANCE_DETECTORS`, `EQUIPMENT_DETECTORS`, `TYPE_DETECTORS`) in order; unrecognized exercises fall through to `'accessory'`.
- **`parseSessionFields.ts`** — `parseSessionDate(row)` / `parseSessionRpe(row)`: date and RPE parsing shared by `parseSession.ts` and `parseRepMaxSessions.ts`.
- **`buildTrainingSession.ts`** — `buildTrainingSession(base, weight, reps)` validates a weight/reps pair (`isNaN`/`reps <= 0`) and builds the resulting `TrainingSession` via `calcE1RM`; shared by `parseSession.ts` and `parseRepMaxSessions.ts` so the two don't duplicate the object-construction logic.
- **`parseSession.ts`** — `parseSession(row, units)` turns a `RawRow` into a single `TrainingSession | null` from literal `weight`/`reps` columns, via `buildTrainingSession`.
- **`parseRepMaxSessions.ts`** — `parseRepMaxSessions(row, units)` turns a `RawRow` with rep-max columns into `TrainingSession[]`, one per populated `NRM` cell (same date/rpe/sets across the row), via `buildTrainingSession`.
- **`parseSessions.ts`** — `parseSessions(row, units)`: the dispatcher used by `parseConjugateData.ts` and `parseTextData.ts`. Prefers `parseRepMaxSessions` when the row has any populated rep-max columns, otherwise falls back to `parseSession`.
- **`dateToken.ts`** — `extractDateToken(line)` scans a whole pasted line (not per-whitespace-token) for the first date-shaped substring — ISO (`YYYY-MM-DD`), slash (`M/D[/YYYY]`), or month-name (`Mon D[, YYYY]` / `D Mon[, YYYY]`), case-insensitive, abbreviated or full month names — and normalizes it to `YYYY-MM-DD`. A missing year defaults to the current calendar year. Returns `{ dateStr, remainder }`; `remainder` has the matched substring removed (or is the original line if nothing matched). Hand-rolled rather than pulling in a date-parsing library, since `@dyel/core` ships dependency-free.
- **`textLineToRow.ts`** — `textLineToRow(line)` adapts a single pasted text line into a `RawRow`, using the same column-key convention as CSV headers (unit lives in the key, e.g. `"1rm (kg)"` / `"weight (lbs)"`) so the rest of this directory's row-level logic works unchanged. First extracts an optional date via `dateToken.ts` into the `date` key (read by `parseSessionFields.ts`'s `parseSessionDate`), then tries the rep-max grammar (`"<exercise> <N>rm <weight><unit>"`), then the sets-by-reps grammar (`"<exercise> [-] <sets>x<reps> @ <weight><unit>"`), falling back to the plain weight/reps grammar (`"<exercise> <weight><unit> x<reps>"`, reps optional, default 1). Returns `null` if none match.

## Key invariants

The detector arrays consumed by `nameToExercise.ts` now live in `../../types/detectors.ts` (shared with other consumers) and are ordered by specificity — earlier entries win. Adding a new keyword must respect this order to avoid shadowing existing matches.

A row uses either the literal `weight`/`reps` format or the rep-max (`NRM`) format, never both — `parseSessions.ts` picks one per row and a row can expand into more than one `TrainingSession`.

The rep-max token pattern (`^\d+rm`, no space between the digits and `rm`) lives only in `repMaxToken.ts`. Anything that needs to recognize a rep-max marker — CSV column header, or the `<N>rm` token inside a pasted text line — must import it from there rather than re-deriving the pattern.
