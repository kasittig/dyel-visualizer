## Interface

Implements `Parser` from _parse/parser.ts_:

```ts
const csvParser: Parser = {
  id: 'csv',
  canParse(input: RawInput): boolean { ... },
  parse(input: RawInput, ctx: ParseContext): SetRecord[] { ... },
};
```

File: `packages/pipeline/src/parse/csv.ts`.

## Input/output

- Input: `RawInput` (CSV text), `ParseContext`.
- Output: `SetRecord[]` (weights always in kg; `meta.rawUnit`/`meta.rawWeight`
  populated for every record).

## Acceptance criteria

- Detects and applies a `weight (lbs)`-style header as `ParseContext.datasetUnit`.
- Detects a `unit` column and uses it as record-level override, taking
  precedence over dataset-level and fallback.
- Detects cell-suffix units, e.g. a weight cell of `"225lbs"`, as record-level.
- Unit precedence resolved via _parse/parser.ts_'s `resolveUnit`, not
  reimplemented locally.
- Converts all weights to kg in the output `SetRecord.weight`; original
  unit/value preserved in `meta.rawUnit`/`meta.rawWeight`.
- Malformed rows throw `ParseError` with the row number and raw row text.
- Passes against the CSV fixtures in _test/fixtures: edge-case CSV and
  freeform logs_ (header-unit, unit-column, and cell-suffix cases).

## Non-goals

- No freeform/text grammar (that's the two `freeform/` issues).
- No tagging, deriving, or dataset logic.
