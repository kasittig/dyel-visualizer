# freeform/ — line-oriented text parsing

Parser for human-written workout logs in freeform text format. Input: raw UTF-8 lines like `2026-01-10 Bench 315x5 @8`. Output: `SetRecord[]` with weights normalized to kg.

## Architecture

Two-stage pipeline:

1. **tokenizer.ts** — Per-line token → semantic role (weight, reps, rpe, unit suffix)
2. **parser.ts** — Multi-line → `SetRecord[]`, handles dates, exercise names, unit context, multi-weight expansion

## Format

Lines have shape: `[DATE] [EXERCISE_NAME] [WEIGHT_REPS_SPEC]`

- **DATE:** `YYYY-MM-DD` only (parsed via `Date(dateStr).setHours(0,0,0,0)`)
- **EXERCISE_NAME:** all tokens until the tokenizable weight/reps part (multi-word ok)
- **WEIGHT_REPS_SPEC:** delegated to tokenizer.ts

Optional preamble: `units: kg` or `units: lbs` on its own line OR same line as data.

- Sets `ParseContext.datasetUnit`
- Applies to all subsequent lines until next preamble (currently no switching mid-file, but architecture allows it)

## Implementation Details

### Exercise Name Boundary Detection

**Challenge:** How do we know where exercise name ends and weight/reps spec begins?

- Tokenizer ignores unknown tokens, so we can't use "does this parse?" as a yes/no.
- Example: `Bench 315x5 @8` vs `Bench Press 315x5 @8` — where does "Bench" or "Bench Press" end?

**Solution:** Work backwards from end of line. Try suffixes of increasing length until tokenization succeeds:

```
tokens = ["Bench", "315x5", "@8"]
- suffix "@8" → tokenize fails (no weights)
- suffix "315x5 @8" → tokenize succeeds ✓
- exerciseName = "Bench", spec = "315x5 @8"
```

This handles multi-word names naturally: `bench press 235x3 @9` finds suffix `235x3 @9` and exercise = `bench press`.

### Unit Precedence

Applied via `resolveUnit(recordUnit, ctx)` from parser.ts:

1. Record unit (from tokenizer, e.g., `100kg`)
2. Dataset unit (from `units: kg` preamble)
3. Fallback (`lbs`, per `ParseContext.fallback`)

Stored in `meta.rawUnit` for audit trail.

### Multi-Weight Expansion

Tokenizer returns `weights: Array<{ value, unit? }>`. Parser loops over array, creating one `SetRecord` per weight:

```
input: "315/335/355 x3"
tokenizer.weights = [{ value: 315 }, { value: 335 }, { value: 355 }]
output: 3 SetRecords, all with reps=3, different weights
```

All records share date, exercise, reps, rpe; only weight differs.

### Error Handling

Tokenizer errors caught and re-wrapped as `ParseError` with line number + raw text:

```ts
try {
  tokenOutput = tokenize(weightRecsSpec);
} catch (err) {
  throw new ParseError(errorMsg, lineNum + 1, rawLine);
}
```

Fails fast on first error (no collect-all mode yet — could be added if needed).

## Testing

21 tests in parser.test.ts covering:

- Basic forms (simple, reversed, preamble)
- Multi-weight shorthand expansion
- Inline unit suffixes (`100kg x 5`)
- Unit precedence (record > dataset > fallback)
- Multi-word exercise names
- Error cases (malformed date, missing spec, tokenizer failure)
- All 7 freeform fixtures

Run: `npm test -w packages/pipeline`

## Non-Goals / Deferred

- Grammar corners (supersets, AMRAP `315x5+`, per-set RPE in shorthand, inline comments, digit-containing exercise names) — all delegated to tokenizer
- Date format variants (M/D, M/D/YYYY) — only YYYY-MM-DD supported; can be extended in `parseDate`
- Duplicate preamble switching mid-file — currently allowed but untested
- Bodyweight parsing — out of scope (is UI state, not log data)

## Extending

**To support new date formats:** Extend `parseDate()` regex and parsing logic.

**To support new weight/reps patterns:** Extend tokenizer.ts grammar, not parser.ts. Parser is format-agnostic.

**To collect all errors instead of fail-fast:** Accumulate `ParseError[]` instead of throwing immediately; requires API change to `parse()` signature.

**To handle preamble switching mid-file:** Already supported (effectiveCtx updated per line). Just needs tests.
