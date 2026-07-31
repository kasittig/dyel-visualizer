# Fixture Files

Test fixtures for CSV and freeform parsers in `@dyel/pipeline`.

## CSV Fixtures

- `csv-header-unit-lbs.csv` — Unit in header (`Weight (lbs)`); bare numbers in cells.
- `csv-unit-column-mixed.csv` — Separate `Unit` column with mixed `kg`/`lbs` per row.
- `csv-cell-suffix-unit.csv` — Unit suffixed directly onto weight cells (`225lbs`, `140kg`).

## Freeform Fixtures

- `freeform-simple-form.txt` — Baseline format: `date exercise weightxreps @rpe`.
- `freeform-reversed-form.txt` — Reversed format: `date exercise repsxweight @ rpe`.
- `freeform-inline-unit-suffix.txt` — Unit suffixed onto the weight value (`100kg`).
- `freeform-preamble-units-kg.txt` — Global unit declared via `units: kg` preamble line.
- `freeform-multi-weight-shorthand.txt` — Multiple weight sets on one line (`315/335/355 x3`).
- `freeform-near-variant-exercise-names.txt` — Varied name strings (`Bench`, `bench press`) to test normalization.
- `freeform-malformed-line.txt` — Missing reps value (`315x @7`) to test error isolation.
