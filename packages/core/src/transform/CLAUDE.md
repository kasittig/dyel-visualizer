# transform/

Contains pure functions that accept raw data and return structured data.

This handles data cleaning, validation, type casting, and mapping.

## Files

- **`parseConjugateData.ts`** — `parseConjugateData(csv)`: the main entry point. Orchestrates `extractCsvRows` → `parsers/nameToExercise` → `parsers/parseSession` into `Array<[ConjugateExercise, TrainingSession]>`.
- **`parseTextData.ts`** — `parseTextData(text)`: the pasted-text-blob analog of `parseConjugateData.ts`. Orchestrates `extractTextLines` → `parsers/textLineToRow` → `parsers/nameToExercise` → `parsers/parseSession` into the same `Array<[ConjugateExercise, TrainingSession]>` shape. Unlike CSV (one sheet-wide unit), each line's unit is detected independently since pasted lines aren't tied to a shared header row.
- **`validateSheetCsv.ts`** — Full structural validation on top of `extractCsvRows`. Returns a verdict (`'ok'` / `'warning'` / `'error'`) plus per-column presence flags, row counts by lift type, and per-row issues (capped at 10). Delegates its per-row weight/reps/RPE checks to `parsers/validateRow.ts`, shared with `validateTextData.ts`; exercise-name-emptiness and date-string validity stay local since CSV's raw `date` cell needs its own validity check.
- **`validateTextData.ts`** — The pasted-text analog of `validateSheetCsv.ts`: validates free text (one exercise per line) via `extractTextLines` → `parsers/textLineToRow` per line, sharing per-line weight/reps/RPE checks with `validateSheetCsv.ts` via `parsers/validateRow.ts`. Returns a `TextValidationResult` (`verdict`/`rows`/`issues`/`warnings`/`rowIssues`) — no `columns`/`headerRow`, since pasted lines have no shared header/column concept (each line carries its own date/unit/exercise inline). Deliberately reuses `SheetValidationResult`'s field names (`rows`/`rowIssues`, not `lines`/`lineIssues`) so the two result types are structurally interchangeable wherever `@dyel/app` renders them.
- **`parseIndexCsv.ts`** — Parses the two-column (`name`, `url`) index CSV into `IndexEntry[]`.
- **`parsers/`** — row/field-level parsing logic used by `parseConjugateData.ts`, `parseTextData.ts`, `validateSheetCsv.ts`, and `validateTextData.ts`. See its own `CLAUDE.md`.

## Key invariants

`detectWeightUnit` (in `parsers/detectWeightUnit.ts`) reads the unit from the column header suffix (`"weight (lbs)"` / `"weight (kg)"`), not from the values. If no unit annotation exists anywhere in the sheet, `parseConjugateData.ts` falls back every row to `'lbs'`; `parseTextData.ts` does the same per line.
