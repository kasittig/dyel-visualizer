# extract/

Contains scripts dedicated solely to fetching raw data.

Each file should handle one source (e.g., an API, a database, or a CSV file).

Functions here should only return raw data without modifying it.

## Files

- **`csvUtils.ts`** — Generic PapaParse wrappers with no domain knowledge: `extractCsvHeaders` finds a header line (optionally by keyword), `parseCsvRows` parses+maps rows with lowercased/trimmed headers and trimmed values.
- **`csvExtract.ts`** — `extractCsvRows` finds the header row (first line containing "exercise") and parses everything below it via `csvUtils`, returning rows typed as `../types/RawRow.ts`'s `RawRow`. Shared entry point for both `parseConjugateData.ts` and `validateSheetCsv.ts` — they must never disagree on what counts as parseable.
- **`textExtract.ts`** — `extractTextLines` splits a pasted `TextFieldInput` blob (`../types/TextFieldInput.ts`) into trimmed, non-empty lines, returning `string[] | null` (`null` when there are no usable lines). No domain parsing of line contents — that belongs in a future `transform/` function. Exported from the `@dyel/core` public barrel since `packages/app` consumes it directly (no `transform/` wrapper exists yet).

Note: the `RawRow` type itself lives in `../types/RawRow.ts`, not here — it's shared by `transform/parsers/` as well. Unit-detection and fallback behavior (`detectWeightUnit`) is documented in `transform/CLAUDE.md`, since that logic lives under `transform/`, not `extract/`.
