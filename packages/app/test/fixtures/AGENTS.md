# app/test/fixtures

Test fixtures for `packages/app` integration tests.

## total-chart-sheet.csv

Real conjugate-method training log data captured from the published Google Sheet.
Originally captured for core-vs-pipeline parity testing; those parity tests (and
`@dyel/core` itself) have since been deleted, but the fixture remains a useful
real-world dataset for pipeline-only tests (e.g. `usePipelineVariationRadarData.test.ts`).

**Source:**

- Sheet URL: `https://docs.google.com/spreadsheets/d/e/2PACX-1vS9PanUA2o9vBFkwPUcsPdmY0DslgGbJ09NC-3lVOdL-l4ASpytzPaPyjvfSs6C_MH0tx7xBnR11g0l/pub`
- Grid ID: `1651262690`
- Fetched: 2026-07-06

**Capture method:**

```bash
# Start dev server (required for sheets-proxy)
npm run dev -w packages/app

# In another terminal, fetch via sheets-proxy to bypass CORS
curl -s "http://localhost:5173/sheets-proxy/spreadsheets/d/e/2PACX-1vS9PanUA2o9vBFkwPUcsPdmY0DslgGbJ09NC-3lVOdL-l4ASpytzPaPyjvfSs6C_MH0tx7xBnR11g0l/pub?gid=1651262690&single=true&output=csv" \
  -o packages/app/test/fixtures/total-chart-sheet.csv
```

**Usage:** consumed directly by pipeline-native tests (currently
`usePipelineVariationRadarData.test.ts`) as a real-data fixture.

**Content:**

- 147 data rows (conjugate training log entries)
- Columns: Date, Exercise, Sets, Reps, Weight (lbs), RPE
- Covers exercises across squat, bench, deadlift, and accessory lift families with variety in equipment/modifiers

This is not anonymized (confirmed with user) — it's a public Google Sheet; sensitive data is not a concern.

## conjugate-top-set-log.csv

Real "CONJUGATE TOP SET LOG" sheet — captured after the sheet reportedly "stopped loading" in
the app. Root cause: its `Date` column is formatted `M/D/YY` (2-digit year, e.g. `1/1/26`), a
shape `packages/pipeline/src/parse/csv.ts`'s `parseDate` didn't accept (only ISO and `M/D/YYYY`
were handled) — the first data row threw a `ParseError`, and because a single bad row aborts
the whole parse `.map()`, the entire sheet failed to load. Fixed in `csv.ts` (see its
`usSlashShortYear` regex and `parse/AGENTS.md`); regression-tested in `csv.test.ts`'s
"csvParser — date formats" block. Kept here as a real-data fixture for that date-shape
regression and any future accessory-subtype-classification tests.

**Source:**

- Sheet URL: `https://docs.google.com/spreadsheets/d/e/2PACX-1vQIbn7-BHEGIF2VcOswgNJ5mJfZq7EjuXnIAj4oFTf8xJeZXWH8xBJ6tZljWWQB1mIQy8462U41JqGl/pub`
- Grid ID: `2041691283`
- Fetched: 2026-07-14

**Capture method:**

```bash
curl -sL "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIbn7-BHEGIF2VcOswgNJ5mJfZq7EjuXnIAj4oFTf8xJeZXWH8xBJ6tZljWWQB1mIQy8462U41JqGl/pub?gid=2041691283&single=true&output=csv" \
  -o packages/app/test/fixtures/conjugate-top-set-log.csv
```

(Fetched directly, not via the dev-server sheets-proxy — the sheet is public and the direct
fetch succeeded outside the browser; the "stopped loading" symptom was a parser bug, not CORS.)

**Content:**

- 26 data rows, single lifter's top-set log across squat/deadlift variants, bench variants, and slingshot/board-press accessory work
- Columns: Date, Exercise, Weight (LB), Reps
- Dates are `M/D/YY` and `M/D/YYYY` mixed within the same column (rows 23–24 use 4-digit years, everything else 2-digit) — this mix is what the regex fix needs to handle

This is not anonymized (confirmed with user) — it's a public Google Sheet; sensitive data is not a concern.
