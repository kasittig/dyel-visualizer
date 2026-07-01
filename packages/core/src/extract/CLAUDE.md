# extract/

Contains scripts dedicated solely to fetching raw data.

Each file should handle one source (e.g., an API, a database, or a CSV file).

Functions here should only return raw data without modifying it.

## Files

- **`csvUtils.ts`** — Generic PapaParse wrappers with no domain knowledge: `extractCsvHeaders` finds a header line (optionally by keyword), `parseCsvRows` parses+maps rows with lowercased/trimmed headers and trimmed values.
- **`types.ts`** — `RawRow` (`Record<string, string>`), the shape every row-level parser operates on.
- **`csvExtract.ts`** — `extractCsvRows` finds the header row (first line containing "exercise") and parses everything below it via `csvUtils`. Shared entry point for both `parseConjugateData.ts` and `validateSheetCsv.ts` — they must never disagree on what counts as parseable.

## Key invariants

`detectWeightUnit` (in `parsers/detectWeightUnit.ts`) reads the unit from the column header suffix (`"weight (lbs)"` / `"weight (kg)"`), not from the values. If no unit annotation exists anywhere in the sheet, `parseConjugateData.ts` falls back every row to `'lbs'`.
