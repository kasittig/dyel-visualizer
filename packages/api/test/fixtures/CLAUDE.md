# api/test/fixtures

Test fixtures for `packages/api` tests and backtests.

## bench-family-e1rm-log.csv

Real bench-heavy conjugate-method training log with extensive variant-switch history. Used to
validate e1RM projection methods that differ in their baseline choice: projecting the fixed
comp-lift baseline forward, vs. projecting whichever family variant was most recently actually
trained. The fixture's abundance of real bench-family variant transitions (board press, chains,
Swiss bar, Duffalo bar, pin press, slingshot) provides a comprehensive dataset for comparing
projection accuracy across many "which variant did they train most recently" state transitions.

**Source:**

- Originally captured from published Google Sheet
- Sheet URL: `https://docs.google.com/spreadsheets/d/e/2PACX-1vS9PanUA2o9vBFkwPUcsPdmY0DslgGbJ09NC-3lVOdL-l4ASpytzPaPyjvfSs6C_MH0tx7xBnR11g0l/pub`
- Grid ID: `1651262690`
- Originally fetched: 2026-07-06
- Copied from `packages/app/test/fixtures/total-chart-2.csv` (byte-identical)

**Fixture copy rationale:**

Per the repo's strict package boundary rules (see root `CLAUDE.md`), packages must not share
files via relative path traversal. Each package maintains its own self-contained fixture copy.
This file is an exact copy used by backtest harnesses in `packages/api/src/repCalculator/`.

**Usage:**

Consumed by e1RM projection backtest harnesses (e.g. `e1rmProjectionBacktest.ts`) to compare
multiple projection strategies across a real training log with meaningful variant history. Enables
validation of which baseline choice (comp-lift vs. most-recently-trained variant) produces more
accurate e1RM projections in practice.

**Content:**

- 86 data rows (bench-heavy conjugate training log entries; row 1 is the title "POWERLIFTING RM LOG", row 2 is headers)
- Columns: Date, Exercise, Weight (lbs), Reps, RPE
- Date range: 2024-05-20 through 2026-07-15 (ISO format)
- Heavy concentration of bench-family variants: board press (1/2 board, with chains), chains (1/2 chains),
  Swiss bar, Duffalo bar, pin press (half range of motion), slingshot, close-grip, incline bench,
  floor press, dumbbell bench, medium-grip, neutral-grip, and others — all tagged under `lift:bench`
- Includes squat, deadlift, and accessory (overhead press, pull-up, etc.) data but bench is dominant
- Real variant-transition sequences useful for state-based projection comparison

This is not anonymized (confirmed with user) — it's a public Google Sheet; sensitive data is not a concern.
