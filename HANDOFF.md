# HANDOFF: Sheet-parsing entry point in `@dyel/api`

Source plan: `SHEET_PARSING.md` (repo root). This file tracks live status;
`SHEET_PARSING.md` is the design doc and stays as-is.

## Status — ALL COMPLETE

- [x] Task 1: Scaffold `LiftType`/`SplitRows`/`liftTypeOf` (Target: `packages/api/src/sheet/parseSheetData.ts`, Test: `npm run build -w packages/api`)
- [x] Task 2: Test `liftTypeOf` (Target: `packages/api/src/sheet/parseSheetData.test.ts`, Test: `npm test -w packages/api`)
- [x] Task 3: Implement + test `splitByEffort` (Target: `packages/api/src/sheet/parseSheetData.ts`, Test: `npm test -w packages/api`)
- [x] Task 4: Implement `parseSheetData` (Target: `packages/api/src/sheet/parseSheetData.ts`, Test: `npm run build -w packages/api`)
- [x] Task 5: E2E test for `parseSheetData` (Target: `packages/api/src/sheet/parseSheetData.test.ts`, Test: `npm test -w packages/api`)
- [x] Task 6: Export from `packages/api/src/index.ts` (Test: `npm run build -w packages/api`)
- [x] Task 7: Per-subdirectory `CLAUDE.md` doc — SKIPPED. `packages/api/src` has no
      existing per-subdirectory `CLAUDE.md` files (unlike `packages/pipeline/src` or
      `packages/app/src`, which do), so per the plan's explicit fallback instruction
      this was not invented.
- [x] Task 8 (QA): `npm test -w packages/api && npm run build -w packages/api && npm run build` — all green (37/37 tests, both builds clean, full monorepo build clean).

## Notable finding from implementation

Per `packages/pipeline/src/tag/CLAUDE.md`'s documented "Unknown heuristic," **every**
accessory-type exercise is filtered out as `unknown` before tagging (the parser always
nulls bar/stance/equipment/addlWts for accessories, which is exactly the unknown-detection
condition). This means `parseSheetData`'s `accessory` bucket will always be empty when
fed real sheet CSVs under current pipeline behavior — this is expected/consistent with
pipeline architecture, not a bug in the new code. The e2e test documents this (a `Curls`
row is included and asserted to be excluded from the `accessory` result).

## Explicit non-goals (not implemented in this pass, per `SHEET_PARSING.md`)

- `useConjugateData.ts`, `appDataUtils.ts`, `sheetCacheUtils.ts`, `RepCalculator.tsx` —
  app-side cutover to consume `parseSheetData` is a separate follow-up task.
- Pre-existing `@dyel/core` imports in `volume/volume.ts`, `filters/exerciseFilters.ts`,
  `chart/buildChartData.ts`, `text/parseTextData.ts` — tracked separately, not touched.
- No network `fetch` added to `@dyel/api` — this package takes a CSV string, not a URL.

## Out-of-scope items observed in the working tree (not part of this task, not committed here)

- `packages/api/src/index.ts` also carries an unrelated pending line
  (`export { TOTAL_CHART_SPECS } from './totalChartSpecs'`) and
  `packages/app/src/pipeline/sessionBarChartParity.test.ts` has an unrelated import-path
  update to consume it via `@dyel/api`. Both predate this task and were left as
  uncommitted working-tree changes, not staged/committed alongside the sheet-parsing work.
- `ADDL_PARITY_TESTS.md` (repo root) — a separate, unrelated planning doc for real
  parity tests on `DateLineChart`/`SessionBarChart`/`SigmaChart`, not touched here.
