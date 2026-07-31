# parse/ — raw inputs → SetRecord[]

Adapters turn raw text into `SetRecord[]`. All unit handling lives and DIES
here: output weights are always kg; no unit information escapes this stage.

## Contract

    interface Parser {
      id: string;
      canParse(input: RawInput): boolean;                      // cheap sniff
      parse(input: RawInput, ctx: ParseContext): SetRecord[];  // throws ParseError with line/row context
    }

Unit precedence: `record-level > ctx.datasetUnit > ctx.fallback ('lbs')`.
`resolveUnit` is internal to this stage — never export it past parse/.
`convertToKg` is a shared helper (unitConversion.ts) used by CSV and freeform adapters — internal to parse/.
Every record carries `meta.rawUnit` / `meta.rawWeight` (audit trail).

## Adapters

- `csv.ts`: header row is located by scanning for the first line containing
  an "exercise"-prefixed column (case-insensitive), allowing title/notes rows
  before the actual header. Dataset unit sniffed from headers ("weight (lbs)");
  record-level from a unit column or cell suffix ("225lbs"). Reps via `parseInt`
  - `isNaN` hard-fail → `ParseError` on non-numeric input (e.g., "AMRAP", "max").
    Date cells accept ISO `YYYY-MM-DD` OR unpadded/padded `M/D/YYYY` OR `M/D/YY` (e.g.
    `2/6/2026`, `02/06/2026`, `1/1/26`) — unlike `freeform/`'s intentionally ISO-only dates
    (below), CSV must tolerate both slash shapes because that's the actual date shape
    Google Sheets' default published-CSV export produces when a sheet's date column has no
    explicit format applied (the common case for a real user's sheet); rejecting either
    shape silently discarded every row in the file (a single bad row aborts the whole
    `.map()`, per the hard-fail policy below), leaving the app with zero tagged records and
    no lift tabs at all — this is exactly what happened with a real sheet whose column was
    formatted `M/D/YY` (see `app/test/fixtures/conjugate-top-set-log.csv`). The 2-digit-year
    shape assumes 20xx (no windowing logic — not worth it until a real 19xx sheet surfaces).
    All shapes parse via `Date.UTC`, never local-time `Date` construction, to avoid
    timezone corruption. Any other shape still hard-fails with `ParseError`.
- `freeform/`: line-oriented, one exercise entry per line, e.g.
  `7/3 comp squat 1rm 200kg`. Whitespace-insensitive tokenizer + per-line
  semantic role assignment (NOT positional templates):
  - `Nrm` → reps=N, sets=1; `x` joins two numbers; `@` → weight or RPE.
  - Unit suffix pins a number as weight.
  - `AxB`: weight found elsewhere on line → sets×reps; else weight×reps.
  - `@N`: unit → weight; unitless N ≤ 10 (halves ok) → RPE; else weight.
  - `315/335/355 x3` → one record per weight.
  - Sets multipliers EXPAND: `3 x 5 @ 100kg` → three identical records.
  - Exercise name = tokens not consumed by date/effort roles (multi-word ok).
  - Dates are optional ISO `YYYY-MM-DD` tokens and may appear anywhere on the line. Missing dates
    default to the current UTC calendar date. Other date formats are treated as exercise text.
    This is the most intricate module in the system. Hard-fail with line
    context; never guess silently.

## Boundaries

- No bodyweight parsing — bodyweight is UI state, never log data.
- No tagging, no exercise-name canonicalization (that's tag/).
- Flag, don't decide: ParseError UX (collect vs fail-fast), grammar corners
  (supersets, AMRAP `315x5+`, per-set RPE in shorthand, comments, digit-
  containing exercise names).
