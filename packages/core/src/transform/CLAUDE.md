# transform/

Contains pure functions that accept raw data and return structured data.

This handles data cleaning, validation, type casting, and mapping.

## Files

- **`parseConjugateData.ts`** — `parseConjugateData(csv)`: the main entry point. Orchestrates `extractCsvRows` → `parsers/nameToExercise` → `parsers/parseSession` into `Array<[ConjugateExercise, TrainingSession]>`.
- **`validateSheetCsv.ts`** — Full structural validation on top of `extractCsvRows`. Returns a verdict (`'ok'` / `'warning'` / `'error'`) plus per-column presence flags, row counts by lift type, and per-row issues (capped at 10).
- **`parseIndexCsv.ts`** — Parses the two-column (`name`, `url`) index CSV into `IndexEntry[]`.
- **`parsers/`** — row/field-level parsing logic used by `parseConjugateData.ts` and `validateSheetCsv.ts`. See its own `CLAUDE.md`.
