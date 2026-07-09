# Sheet-parsing entry point in `@dyel/api`

## Context

`packages/app/src/hooks/conjugate/useConjugateData.ts` still fetches the
Google Sheet CSV and parses it via `parseConjugateData` from `@dyel/core`,
feeding `App.tsx`'s `tabRows` (via `utils/appDataUtils.ts`'s `buildTabRows`/
`extractPairs`) which in turn drives `RepCalculator`'s `tabRows` prop and
the sigma tab's volume/max-effort correlation. This is the one piece of the
main user-facing flow still on the legacy `@dyel/core` backend — everything
else (`ConjugateCharts`, `VariationRadarChart`, `DiagnosticsPanel`,
`TotalChart`/`SigmaTab` charts) is pipeline-native.

`@dyel/pipeline` already has everything needed to replace this: `csvParser`
(raw CSV → `SetRecord[]`), `resolveCanonicalNames`/`tagRecords` (→
`TaggedSetRecord[]`, exercise canonicalization + tagging, including
`lift:squat`/`lift:bench`/`lift:deadlift` tags used elsewhere for family
grouping — see `packages/pipeline/src/derive/normalize.ts`), all wrapped by
`runPipelineModel(raw, athlete)`. What's missing is an `@dyel/api` function
that calls `runPipelineModel` on a raw sheet CSV and reshapes the result into
the per-lift-type, effort-split structure the app currently gets from
`parseConjugateData` + `buildTabRows`.

**Design note:** per `packages/api/CLAUDE.md`'s stated convention, most
`@dyel/api` functions take an already-computed `PipelineModel`. This one is
a deliberate, documented exception — like `parseTextData`, it exists to
_produce_ data ahead of/alongside model construction (the raw CSV entry
point), not to derive from an existing model. It must import only from
`@dyel/pipeline` (per `packages/api/package.json`'s declared dependency —
it does **not** depend on `@dyel/core`), never `@dyel/core`. This keeps the
new code correctly bounded even though some older files in
`packages/api/src` (`volume/volume.ts`, `filters/exerciseFilters.ts`,
`chart/buildChartData.ts`, `text/parseTextData.ts`) currently still import
`@dyel/core` internally — that's pre-existing debt, out of scope here, and
should NOT be used as a pattern to copy.

**Scope:** this plan covers only the new `@dyel/api` entry point and its
tests. Cutting `App.tsx`/`useConjugateData`/`appDataUtils`/`RepCalculator`
over to consume it is a separate, follow-up migration (it requires
re-typing `SplitRows`/`RepCalculator` away from `ConjugateDataPair`, which
touches app-side UI code) and is intentionally **not** part of this task
list.

## Target design

New file: `packages/api/src/sheet/parseSheetData.ts`

```ts
import type { AthleteContext, RawInput, TaggedSetRecord } from '@dyel/pipeline';
import { runPipelineModel } from '@dyel/pipeline';

export type LiftType = 'squat' | 'bench' | 'deadlift' | 'accessory';

export interface SplitRows {
  all: TaggedSetRecord[];
  maxEffort: TaggedSetRecord[];
  volume: TaggedSetRecord[];
}

export function parseSheetData(csv: string, athlete: AthleteContext): Record<LiftType, SplitRows>;
```

- `liftTypeOf(record)`: maps a `TaggedSetRecord` to `LiftType` by checking
  `record.tags.has('lift:squat' | 'lift:bench' | 'lift:deadlift')`,
  defaulting to `'accessory'`. Mirrors the family-tag convention already
  used in `packages/pipeline/src/derive/normalize.ts`.
- `splitByEffort(records, type)`: for `'accessory'`, returns
  `{ all: records, maxEffort: records, volume: [] }` (accessories aren't
  split). For squat/bench/deadlift, a record goes to `maxEffort` if
  `record.sets === 1 || record.rpe !== undefined`, else `volume` — this is
  the same threshold already used for the CSV pre-fit filter in
  `packages/pipeline/src/pipeline.ts` (`fitInput`), just reused here for
  effort-splitting instead of curve-fitting. Mirrors
  `packages/app/src/utils/appDataUtils.ts`'s `splitByEffort`, adapted from
  `ConjugateDataPair`/`TrainingSession` fields to `TaggedSetRecord` fields.
- `parseSheetData(csv, athlete)`: wraps `csv` in a single `RawInput`
  (`{ name: 'sheet.csv', content: csv }` — matches the `.csv`-suffix
  `canParse` check in `packages/pipeline/src/parse/csv.ts`), runs
  `runPipelineModel`, groups `model.tagged` by `liftTypeOf` (use
  `Map.groupBy`/`Object.groupBy` per this repo's native-operations
  convention — see root `CLAUDE.md`), and returns the four
  `splitByEffort` results.

## Tasks

- [ ] Task 1: Scaffold `packages/api/src/sheet/parseSheetData.ts` with the
      `LiftType` and `SplitRows` types plus a `liftTypeOf(record:
    TaggedSetRecord): LiftType` helper (tag-based family lookup as
      described above; use a `Record`/lookup table for the three lift tags,
      not an if/else chain). No test file yet — just the types + helper,
      unexported or exported as needed for the next task's tests.
      (Target: `packages/api/src/sheet/parseSheetData.ts`, Test: `npm run build -w packages/api`)

- [ ] Task 2: Add `packages/api/src/sheet/parseSheetData.test.ts` covering
      `liftTypeOf` only. Build tiny inline `TaggedSetRecord` fixtures (a
      factory function per this repo's "streamlined mock factories" testing
      convention — see root `CLAUDE.md` — with sane defaults and a `tags`
      override) and use `it.each` to assert `liftTypeOf` returns `'squat'`
      for a record tagged `lift:squat`, `'bench'` for `lift:bench`,
      `'deadlift'` for `lift:deadlift`, and `'accessory'` for a record with
      none of those tags. Export `liftTypeOf` temporarily from
      `parseSheetData.ts` for this test if it isn't already.
      (Target: `packages/api/src/sheet/parseSheetData.test.ts`, Test: `npm test -w packages/api`)

- [ ] Task 3: Add `splitByEffort(records: TaggedSetRecord[], type:
    LiftType): SplitRows` to `parseSheetData.ts` per the design above
      (accessory passthrough; squat/bench/deadlift split on `sets === 1 ||
    rpe !== undefined`). Add matching `it.each` test cases to
      `parseSheetData.test.ts`: accessory returns everything in both `all`
      and `maxEffort` with empty `volume`; a mix of `sets:1`/`rpe`-defined
      records vs multi-set/no-rpe records for a non-accessory type splits
      correctly into `maxEffort`/`volume`.
      (Target: `packages/api/src/sheet/parseSheetData.ts`, Test: `npm test -w packages/api`)

- [ ] Task 4: Implement `parseSheetData(csv: string, athlete:
    AthleteContext): Record<LiftType, SplitRows>` in `parseSheetData.ts`,
      calling `runPipelineModel` from `@dyel/pipeline` and composing
      `liftTypeOf` + `splitByEffort` as described in the design section.
      Group `model.tagged` with `Map.groupBy`/`Object.groupBy`, not a
      manual loop. Do not import anything from `@dyel/core`.
      (Target: `packages/api/src/sheet/parseSheetData.ts`, Test: `npm run build -w packages/api`)

- [ ] Task 5: Add an end-to-end test for `parseSheetData` in
      `parseSheetData.test.ts` using a small inline CSV fixture string
      (headers: `Date,Exercise,Reps,Weight (lbs)` at minimum, per
      `packages/pipeline/src/parse/csv.ts`'s required-column check) with a
      handful of rows covering squat/bench/deadlift/accessory exercises
      and a placeholder `AthleteContext` (reuse the shape of
      `packages/app/src/utils/rawInputUtils.ts`'s `PLACEHOLDER_ATHLETE` as
      a local const, not an import — `@dyel/api` must not depend on
      `@dyel/app`). Assert the returned object has all four `LiftType` keys
      and that rows land in the expected bucket (`all`/`maxEffort`/
      `volume`).
      (Target: `packages/api/src/sheet/parseSheetData.test.ts`, Test: `npm test -w packages/api`)

- [ ] Task 6: Export `parseSheetData`, `LiftType`, and `SplitRows` from
      `packages/api/src/index.ts` (follow the existing one-line-per-export
      pattern already in that file).
      (Target: `packages/api/src/index.ts`, Test: `npm run build -w packages/api`)

- [ ] Task 7: Add a `sheet/` entry to `packages/api/src`'s module docs (if
      an index/`CLAUDE.md` convention exists for this package — check
      sibling packages' `src/*/CLAUDE.md` files for the pattern first; if
      `packages/api` doesn't yet have per-subdirectory `CLAUDE.md` files,
      skip this task rather than inventing a new doc convention).
      (Target: `packages/api/src/sheet/CLAUDE.md` if applicable, Test: `npm test -w packages/api`)

- [ ] Task 8 (QA): Run the full `@dyel/api` test suite and build, plus a
      full-repo build, to confirm nothing else broke.
      (Target: n/a, Test: `npm test -w packages/api && npm run build -w packages/api && npm run build`)

## Explicit non-goals (do not implement in this pass)

- Do not touch `useConjugateData.ts`, `appDataUtils.ts`,
  `sheetCacheUtils.ts`, or `RepCalculator.tsx` — the app-side cutover is a
  separate follow-up task once this entry point exists and is reviewed.
- Do not fix the pre-existing `@dyel/core` imports in
  `volume/volume.ts`, `filters/exerciseFilters.ts`, `chart/buildChartData.ts`,
  or `text/parseTextData.ts` — that's tracked separately.
- Do not add sheet-fetching (network `fetch`) to `@dyel/api` — this package
  takes a CSV string, not a URL; fetching stays app-side
  (`utils/sheetFetch.ts`).
