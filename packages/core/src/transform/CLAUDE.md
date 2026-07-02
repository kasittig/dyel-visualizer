# transform/

Contains pure functions that accept raw data and return structured data.

This handles data cleaning, validation, type casting, and mapping.

## Files

- **`parseConjugateData.ts`** — `parseConjugateData(csv)`: the main entry point. Orchestrates `extractCsvRows` → `parsers/nameToExercise` → `parsers/parseSessions` into `Array<[ConjugateExercise, TrainingSession]>`. A single row can expand into multiple pairs (see rep-max invariant below).
- **`parseTextData.ts`** — `parseTextData(text)`: the pasted-text-blob analog of `parseConjugateData.ts`. Orchestrates `extractTextLines` → `parsers/textLineToRow` → `parsers/nameToExercise` → `parsers/parseSessions` into the same `Array<[ConjugateExercise, TrainingSession]>` shape. Unlike CSV (one sheet-wide unit), each line's unit is detected independently since pasted lines aren't tied to a shared header row.
- **`validateSheetCsv.ts`** — Full structural validation on top of `extractCsvRows`. Returns a verdict (`'ok'` / `'warning'` / `'error'`) plus per-column presence flags, row counts by lift type, and per-row issues (capped at 10). `rows.parsed`/`liftTypes` count sessions (post rep-max expansion), not raw rows, to stay in sync with `parseConjugateData`. Delegates its per-row weight/reps/rep-max/RPE checks to `parsers/validateRow.ts`, shared with `validateTextData.ts`; exercise-name-emptiness and date-string validity stay local since CSV's raw `date` cell needs its own validity check.
- **`validateTextData.ts`** — The pasted-text analog of `validateSheetCsv.ts`: validates free text (one exercise per line) via `extractTextLines` → `parsers/textLineToRow` per line, sharing per-line weight/reps/rep-max/RPE checks with `validateSheetCsv.ts` via `parsers/validateRow.ts`. Returns a `TextValidationResult` (`verdict`/`lines`/`issues`/`warnings`/`lineIssues`) — no `columns`/`headerRow`, since pasted lines have no shared header/column concept (each line carries its own date/unit/exercise inline).
- **`parseIndexCsv.ts`** — Parses the two-column (`name`, `url`) index CSV into `IndexEntry[]`.
- **`parsers/`** — row/field-level parsing logic used by `parseConjugateData.ts`, `parseTextData.ts`, `validateSheetCsv.ts`, and `validateTextData.ts`. See its own `CLAUDE.md`.

## Key invariants

`detectWeightUnit` (in `parsers/detectWeightUnit.ts`) reads the unit from the column header suffix (`"weight (lbs)"` / `"weight (kg)"`, or a rep-max column like `"1rm (kg)"`), not from the values. If no unit annotation exists anywhere in the sheet, `parseConjugateData.ts` falls back every row to `'lbs'`; `parseTextData.ts` does the same per line.

Sheets may use rep-max columns (`1RM`, `3RM`, `5RM`, ...) instead of literal `weight`/`reps` columns — each populated `NRM` cell on a row is its own weight-at-N-reps data point. `parsers/parseSessions.ts` dispatches per row: if any rep-max columns are populated, it expands the row into one `TrainingSession` per populated cell (via `parsers/parseRepMaxSessions.ts`) instead of the single-session `parsers/parseSession.ts` path. This is why `parseConjugateData.ts` and `validateSheetCsv.ts` must treat "row" and "session" as different counts.

`parseTextData.ts` reuses this same rep-max/plain dispatch: `parsers/textLineToRow.ts` adapts each pasted line into a `RawRow` using the identical column-key convention CSV headers use (unit in the key, e.g. `"1rm (kg)"` / `"weight (lbs)"`), so `findRepMaxCols`, `detectWeightUnit`, and `parseSessions` all work unchanged on text-derived rows. `validateTextData.ts` reuses the same `textLineToRow` adaptation for its per-line validation.
