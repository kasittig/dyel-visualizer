# parsing/

CSV ingestion: reading, classifying, and validating workout log data.

## Files

- **`sheetRows.ts`** — Finds the header row (first line containing "exercise") and PapaParse-parses everything below it. This is the shared entry point for both the real parser and the validator — they must never disagree on what counts as parseable.
- **`parseConjugateData.ts`** — Parses a CSV string into `ConjugateDataPair[]`. `nameToExercise` converts free-text exercise names into structured `ConjugateExercise` objects using ordered keyword detectors; unrecognized exercises fall through to `'accessory'`. `findCol` matches column headers by prefix (e.g. `"weight"` matches `"weight (lbs)"`).
- **`parseIndexCsv.ts`** — Parses the two-column (`name`, `url`) index CSV into `IndexEntry[]`.
- **`validateSheetCsv.ts`** — Full structural validation on top of `parseSheetRows`. Returns a verdict (`'ok'` / `'warning'` / `'error'`) plus per-column presence flags, row counts by lift type, and per-row issues (capped at 10).

## Key invariants

The detector arrays in `parseConjugateData.ts` are ordered by specificity — earlier entries win. Adding a new keyword must respect this order to avoid shadowing existing matches.

`detectWeightUnit` reads the unit from the column header suffix (`"weight (lbs)"` / `"weight (kg)"`), not from the values. If no unit annotation exists anywhere in the sheet, the parser falls back to `'lbs'`.
