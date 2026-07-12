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
