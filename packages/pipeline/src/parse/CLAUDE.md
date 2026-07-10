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

- `csv.ts`: dataset unit sniffed from headers ("weight (lbs)"); record-level
  from a unit column or cell suffix ("225lbs").
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
  - Dates `M/D` or `M/D/YYYY`; missing year → current year.
    This is the most intricate module in the system. Hard-fail with line
    context; never guess silently.

## Boundaries

- No bodyweight parsing — bodyweight is UI state, never log data.
- No tagging, no exercise-name canonicalization (that's tag/).
- Flag, don't decide: ParseError UX (collect vs fail-fast), grammar corners
  (supersets, AMRAP `315x5+`, per-set RPE in shorthand, comments, digit-
  containing exercise names).
