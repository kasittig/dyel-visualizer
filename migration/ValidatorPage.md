# Add a validation test for ValidatorPage (legacy-only, migration likely out of scope)

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`,
this doc covers `ValidatorPage`, but with a different conclusion than the other
"not yet migrated" components in `APP_COMPONENTS.md`.

## Context

`ValidatorPage.tsx` depends on `SheetValidationResult`/`ColumnInfo` (`@dyel/core`).
`APP_COMPONENTS.md` flags this as "likely intentionally core-only — legacy sheet
validator": its job is to validate the _raw input sheet shape_ before any parsing/
normalization happens, which is arguably orthogonal to the core-vs-pipeline migration —
there's no pipeline "chart output" to diff against, since this page runs before the
pipeline (or legacy parser) is invoked at all.

## Plan

1. Confirm with the team whether `ValidatorPage` is in scope for migration at all, or
   intentionally stays on `@dyel/core` as a pre-parse validation step shared by both
   backends. Do not assume migration is required before this is settled — treat it as a
   proposed pipeline change only if the answer is "yes, migrate."
2. Regardless of the migration decision, add a **validation test** (not a parity test —
   there's no pipeline counterpart to diff against) that locks down `ValidatorPage`'s
   current legacy behavior: `it.each` over representative sheet shapes (missing columns,
   wrong types, extra columns, valid shape) asserting `SheetValidationResult`/`ColumnInfo`
   output, so a future migration decision has a regression safety net either way.
3. New file: `packages/app/src/components/pages/ValidatorPage.test.tsx` (or a colocated
   `useSheetValidation`/`useTextValidation` hook test, since those hooks — listed as
   "supporting hooks" in `APP_COMPONENTS.md` — feed this page and are the more testable
   seam than the page component itself).

## Verification

`npm test -w packages/app -- ValidatorPage`
