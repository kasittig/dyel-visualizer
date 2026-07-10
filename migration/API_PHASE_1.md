# API Phase 1: Add `@dyel/api` modules to absorb pipeline-adjacent logic

## Status: DONE (Tasks 1-12 complete; Task 12b deferred per its own entry)

## Background

This is the first of four phased docs implementing the decision recorded in (now
superseded) `PipelineApiBoundary.md`: `@dyel/api` becomes the sole boundary between
`packages/app` and `@dyel/pipeline` (Option A). App components/hooks should never
import `@dyel/pipeline` directly, with exactly two documented exceptions (see Phase 2).

This phase only adds code to `packages/api` — no `packages/app` files are touched yet.
See `API_PHASE_2.md` for the app-side consumer updates that depend on this phase,
`API_PHASE_3.md` for verification, and `API_PHASE_4.md` for doc cleanup.

## Design decisions (revised: no re-exports — types only shared with pipeline)

**Hard rule:** `packages/pipeline` must contain only the code `runPipeline`/
`runPipelineModel` actually needs to execute. `@dyel/api` and `@dyel/pipeline` share
**types only** — never a value/function re-exported from one through the other just for
convenience.

Every symbol the original version of this doc proposed re-exporting was checked against
`runPipeline`/`runPipelineModel`'s real internal call graph (`pipeline.ts` → parse →
`tag/tag.ts`'s `tagRecords`/`resolveCanonicalNames` → `derive/normalize.ts` →
`derive/derivers.ts` → `analyze/diagnose.ts`; separately `buildDatasetsFromModel` →
`dataset/build.ts`'s `buildDataset`, which calls `matches`). Result:

- **Consumer-only** (never called by the engine itself, and self-contained enough to
  copy without dragging in other engine internals — physically move the
  implementation into `@dyel/api`, do not re-export): `facetsFromTags`,
  `facetFamilyKey`, the `CONJUGATE_BARS`/`CONJUGATE_STANCES`/`CONJUGATE_EQUIPMENT`/
  `CONJUGATE_ADDL_WTS` const arrays, `computeStrengthScores`, `LINE_COLORS`. These get
  deleted from `packages/pipeline` entirely once nothing depends on pipeline's copy
  anymore (Task 12b, deferred).
- **Engine-internal, used only as an implementation detail inside new `@dyel/api`
  modules, never exposed on `@dyel/api`'s own public surface** (`matches`,
  `buildDatasetsFromModel`): these genuinely are the compute engine's own dataset/
  tag-query primitives, not "pipeline-adjacent business logic" being funneled through
  a re-export. `packages/api/src/getCompetitionTotal.ts` already establishes the
  precedent: `import { buildDatasetsFromModel } from '@dyel/pipeline'` directly, no
  wrapper, no re-export. Every new `@dyel/api` file in this phase that needs `matches`
  or `buildDatasetsFromModel` imports them directly from `@dyel/pipeline`;
  `packages/api/src/index.ts` never re-exports either one, because no external
  consumer needs them directly once the logic that used to call them inline
  (`usePipelineVariationRadarData.ts`'s loops, etc.) has itself moved into `@dyel/api`.
- **Engine-internal AND still needed directly by external consumers, with no feasible
  way to duplicate — a narrow, explicitly documented re-export exception**
  (`classifyExerciseName`): it's a thin wrapper over `parseExercise`, the same
  non-trivial keyword-detector parser `tagRecords`/`resolveCanonicalNames` use
  internally — `tag/CLAUDE.md` explicitly says nothing outside `tag/` should reach
  into `tag/detect/` internals, and `parseExercise` isn't part of pipeline's public
  `index.ts` surface, so `@dyel/api` cannot reimplement it without either duplicating
  the detector engine (high drift risk) or reaching into internals pipeline itself
  puts off-limits. Unlike `matches`/`buildDatasetsFromModel` (only used inside other
  `@dyel/api` modules), `classifyExerciseName` is consumed directly by
  `packages/app`'s validators with no intervening `@dyel/api` logic to fold it into —
  so `@dyel/api`'s `validation/classifyExerciseName.ts` is a genuine, minimal
  pass-through re-export of `@dyel/pipeline`'s `classifyExerciseName`, in the same
  documented-exception category as `parseSheetData`/`parseTextData` calling
  `runPipelineModel` internally. Flag this explicitly in Task 12's `CLAUDE.md` update
  so it doesn't read as an inconsistency with the "no re-exports" rule.
- **Types** (`PipelineModel`, `AthleteContext`, `RawInput`, `RenderParams`,
  `RechartsRow`, `ChartPoint`, `DatasetSpec`, `NormalizationModel`, `Point`,
  `PipelineResult`, `VariantAssessment`, `TaggedSetRecord`, `Conjugate*` facet types):
  fine to keep as type-only re-exports from `@dyel/pipeline` — types are compile-time
  only and create no runtime coupling. This is the one form of "sharing" that's allowed.

**Timing note (why pipeline isn't trimmed down in this phase):** `packages/app` still
imports `computeStrengthScores` (`StrengthScoreCalculator.tsx`) and `LINE_COLORS`
(`ConjugateCharts.tsx`) directly from `@dyel/pipeline` today. Deleting them from
`packages/pipeline/src` now would break `packages/app`'s build before
`API_PHASE_2.md`'s Tasks 19/20 repoint those specific files to `@dyel/api`. So this
phase **duplicates**, it does not yet delete: `@dyel/api` gets its own real, owned copy
now; `packages/pipeline` keeps exporting its copies until Phase 2 lands. **Task 12b**
below (deferred, do not execute yet) deletes them from `packages/pipeline` for good once
Phase 2's repoints are in. (`classifyExerciseName` is exempt from Task 12b — it stays in
`packages/pipeline` permanently, since `@dyel/api`'s copy is a documented re-export, not
a duplicate to reconcile away.)

New subfolders under `packages/api/src/`, following the existing `sheet/`, `text/`,
`volume/` convention (one concept per folder, functions take a `PipelineModel` or a
slice like `TaggedSetRecord[]` plus component params, return plain data, no React
dependency — per `packages/api/CLAUDE.md`):

- `conjugate/facets.ts` — **owned implementations** (physically copied, not
  re-exported) of `CONJUGATE_BARS`, `CONJUGATE_STANCES`, `CONJUGATE_EQUIPMENT`,
  `CONJUGATE_ADDL_WTS`, `facetsFromTags`, `facetFamilyKey`. The `Conjugate*` facet
  **types** are still imported from `@dyel/pipeline` (type-only sharing, not redefined).
- `conjugate/conjugateBestSet.ts` (+ `.test.ts`) — moved verbatim from
  `packages/app/src/pipeline/conjugateBestSet.ts`. It imports `matches` from
  `@dyel/pipeline` directly — keep that import as-is (engine-internal exception).
- `conjugate/conjugateChartSpecs.ts` — moved verbatim from
  `packages/app/src/pipeline/conjugateChartSpecs.ts`.
- `session/lastSessionDetail.ts` (+ `.test.ts`) — moved from
  `packages/app/src/pipeline/lastSessionDetail.ts`. Named `session/`, not `conjugate/`,
  since it's generic per-lift-type logic, not conjugate-specific. Also imports `matches`
  directly from `@dyel/pipeline` — keep as-is.
- `variation/variationSnapshot.ts` (+ `.test.ts`) — moved from
  `packages/app/src/utils/variationSnapshot.ts`.
- `variation/variationRadarSelectors.ts` (new) — `buildCanonicalByLabel(tagged,
liftType)` and `resolveTargetLabel(tagged, liftType, targetCanonical)`, extracted
  from the inline `for` loops in `usePipelineVariationRadarData.ts`. These loops call
  `matches` from `@dyel/pipeline` directly — keep that import (engine-internal
  exception), don't route it through the new `conjugate/facets.ts` file (unrelated).
- `chart/pipelineChartUtils.ts` (+ `.test.ts`) — moved whole-file from
  `packages/app/src/utils/pipelineChartUtils.ts`, **including** `formatChartDate`.
- `repCalculator/repCalculatorUtils.ts` (+ `.test.ts`) — moved verbatim from
  `packages/app/src/pipeline/repCalculatorUtils.ts` (`selectBestE1RMPoint`,
  `findBestE1RMFromPipeline`, `predictWeightForReps`, `predictRepsForWeight`,
  `convertE1RMToDisplayUnit`, `resolveE1RMEstimate`, `E1RMEstimate` type). This file
  already has zero React dependency — a pure move.
- `repCalculator/repCalculatorSelectors.ts` (new) — `availableEquipmentMagnitudes(records,
selectedEquipment)`, `exercisesForLiftType(records)`, `resolveEffectiveCanonical(records,
{ liftType, selectedRecord, selectedBar, selectedStance, selectedEquipment,
selectedEquipmentMagnitude, selectedAddlWt })` — extracted from the candidate-key +
  facet-matching logic currently inline in `components/shared/RepCalculator.tsx`
  (**extract from the current working-tree file, not the last git commit** — it has an
  uncommitted native-operations-style refactor on top of HEAD that's fine/preferred to
  extract from). Calls the new local `conjugate/facets.ts` (`facetsFromTags`,
  `facetFamilyKey`), not `@dyel/pipeline`'s.
- `validation/classifyExerciseName.ts` (new) — **owned implementation** (physically
  copied, not re-exported) of `@dyel/pipeline`'s `classifyExerciseName`.
- `computeStrengthScores` and `LINE_COLORS` — **owned implementations** (physically
  copied), added directly to `index.ts` (no new file needed, matching how
  `TOTAL_CHART_SPECS`/`LiftType` already work as flat top-level exports).
- Type-only re-exports added directly to `index.ts`: `PipelineModel`, `AthleteContext`,
  `RawInput`, `RenderParams`, `RechartsRow`, `ChartPoint`, `DatasetSpec`,
  `NormalizationModel`, `Point`, `PipelineResult`, `VariantAssessment`,
  `TaggedSetRecord`.

Any `convertWeight`/`roundWeight` helper imports pulled in by moved files should be
resolved by duplicating the small pure function into `@dyel/api` rather than creating an
app→api dependency inversion.

## Task list

Tasks 1-3 have no interdependencies and can run fully in parallel. Tasks 4-11 each
touch a disjoint file/pair and can also run in parallel with 1-3 and each other,
**except** Task 8 conceptually pairs with Task 5 (both conjugate-adjacent), Task 8 also
depends on Task 7 landing first (imports `variationSnapshot.ts`'s exports are unrelated,
but both live in `variation/` — order doesn't strictly matter, run together), and Task
11 should land after Task 2 and Task 10 (it calls Task 2's `facetsFromTags`/
`facetFamilyKey` and Task 10's `resolveE1RMEstimate`/`E1RMEstimate`). Task 12 is last,
once everything else in this phase has landed. Task 12b is a **separate, deferred**
follow-up — do not execute it in this session (see its entry below for why).

- [x] Task 1: Add **type-only** re-exports to `packages/api/src/index.ts`. Add these
      two lines near the top of the file, alongside the existing exports (do not
      remove any existing export line):
      `ts
    export type {
      PipelineModel,
      AthleteContext,
      RawInput,
      RenderParams,
      RechartsRow,
      ChartPoint,
      DatasetSpec,
      NormalizationModel,
      Point,
      PipelineResult,
      VariantAssessment,
      TaggedSetRecord,
    } from '@dyel/pipeline';
    `
      Do **not** add value exports for `computeStrengthScores`, `buildDatasetsFromModel`,
      or `LINE_COLORS` in this task — `computeStrengthScores`/`LINE_COLORS` are added as
      owned code in Task 2b below; `buildDatasetsFromModel` is never exported from
      `@dyel/api` (Target: `packages/api/src/index.ts`, Test:
      `npm run build -w packages/api`)

- [x] Task 2: Create `packages/api/src/conjugate/facets.ts` with **physically copied**
      (not re-exported) implementations. Read
      `packages/pipeline/src/tag/tag.ts` for the exact current source of
      `facetsFromTags` and `facetFamilyKey`, and
      `packages/pipeline/src/tag/detect/conjugate-types.ts` for the exact current
      source of the `CONJUGATE_BARS`/`CONJUGATE_STANCES`/`CONJUGATE_EQUIPMENT`/
      `CONJUGATE_ADDL_WTS` const arrays. Copy those five value declarations (two
      functions, four const arrays — `CONJUGATE_ADDL_WTS` and `SLUG_TO_ADDL_WT` are
      both needed since `facetsFromTags` depends on `SLUG_TO_ADDL_WT`) verbatim into
      the new file, preserving their doc comments. Do **not** copy or redefine the
      `Conjugate*` **types** (`ConjugateBar`, `ConjugateStance`, `ConjugateEquipment`,
      `ConjugateAddlWt`) — import those from `@dyel/pipeline` as type-only imports at
      the top of the new file instead:
      `ts
    import type {
      ConjugateBar,
      ConjugateStance,
      ConjugateEquipment,
      ConjugateAddlWt,
    } from '@dyel/pipeline';
    `
      Then in `packages/api/src/index.ts`, add:
      `ts
    export {
      CONJUGATE_BARS,
      CONJUGATE_STANCES,
      CONJUGATE_EQUIPMENT,
      CONJUGATE_ADDL_WTS,
      facetsFromTags,
      facetFamilyKey,
    } from './conjugate/facets';
    export type {
      ConjugateBar,
      ConjugateStance,
      ConjugateEquipment,
      ConjugateAddlWt,
    } from '@dyel/pipeline';
    `
      (Target: `packages/api/src/conjugate/facets.ts`, `packages/api/src/index.ts`,
      Test: `npm run build -w packages/api`)

- [x] Task 2b: Add **physically copied** (not re-exported) implementations of
      `computeStrengthScores` and `LINE_COLORS` directly into
      `packages/api/src/index.ts` (no new subfolder — flat top-level, matching
      `TOTAL_CHART_SPECS`). Read `packages/pipeline/src/derive/athlete.ts` for
      `computeStrengthScores`'s exact current implementation (note: it depends on
      internal helpers `calc`, `calculatePercentileRank`, `calculateSchwartzMalone`,
      and constant tables `WILKS`, `DOTS`, `WILKS_PERCENTILE`, `DOTS_PERCENTILE`,
      `SCHWARTZ_MALONE_MALE`/`FEMALE`, `SCHWARTZ_MALONE_PERCENTILE`, and
      `convertUnits` — copy the full dependency chain needed for
      `computeStrengthScores` to work standalone into a new
      `packages/api/src/strengthScores.ts` file, not directly into `index.ts`, since
      it's too much code for a bare top-level file). Read
      `packages/pipeline/src/utils/colors.ts` for `LINE_COLORS`'s exact current value
      and copy it into a new `packages/api/src/colors.ts` file. Then wire both into
      `packages/api/src/index.ts`:
      `ts
    export { computeStrengthScores } from './strengthScores';
    export { LINE_COLORS } from './colors';
    `
      (Target: `packages/api/src/strengthScores.ts`, `packages/api/src/colors.ts`,
      `packages/api/src/index.ts`, Test: `npm run build -w packages/api`)

- [x] Task 3: Create `packages/api/src/validation/classifyExerciseName.ts` as a
      **documented, minimal pass-through re-export** of `@dyel/pipeline`'s
      `classifyExerciseName` — this is the one deliberate exception to the "no
      re-exports" rule (see Design decisions above: `parseExercise`, the parser it
      wraps, isn't part of pipeline's public surface and lives in `tag/detect/`
      internals that `tag/CLAUDE.md` says nothing outside `tag/` may import — so this
      cannot be physically copied without duplicating the detector engine). Content:
      `ts
    export { classifyExerciseName } from '@dyel/pipeline';
    `
      Add a one-line comment above it explaining why this file exists (documented
      exception, not an oversight):
      `ts
    // Deliberate exception to @dyel/api's "no pipeline re-exports" rule: classifyExerciseName
    // wraps pipeline's internal parseExercise detector, which isn't safely duplicable outside
    // packages/pipeline (see migration/API_PHASE_1.md's Design decisions section).
    export { classifyExerciseName } from '@dyel/pipeline';
    `
      Wire into `index.ts`:
      `ts
    export { classifyExerciseName } from './validation/classifyExerciseName';
    `
      (Target: `packages/api/src/validation/classifyExerciseName.ts`,
      `packages/api/src/index.ts`, Test: `npm run build -w packages/api`)

- [x] Task 4: Move `packages/app/src/pipeline/conjugateBestSet.ts` + `.test.ts` to
      `packages/api/src/conjugate/conjugateBestSet.ts` + `.test.ts` verbatim. The file
      imports `matches`, `isSpeedWork`, `calcE1RM` from `@dyel/pipeline` — keep all
      three imports exactly as-is (engine-internal exception, do not route through the
      new `conjugate/facets.ts`). Adjust only the relative import path if the test
      file references the source file by relative path. Wire export into `index.ts`:
      `ts
    export { buildBestSetByLabelAndDate } from './conjugate/conjugateBestSet';
    export type { BestSet } from './conjugate/conjugateBestSet';
    `
      (Target: `packages/api/src/conjugate/conjugateBestSet.ts`, Test:
      `npm test -w packages/api`)

- [x] Task 5: Move `packages/app/src/pipeline/conjugateChartSpecs.ts` to
      `packages/api/src/conjugate/conjugateChartSpecs.ts` verbatim (it only imports
      the `DatasetSpec` type from `@dyel/pipeline` — keep as type-only import). Wire
      export into `index.ts`:
      `ts
    export { conjugateChartSpecs } from './conjugate/conjugateChartSpecs';
    `
      (Target: `packages/api/src/conjugate/conjugateChartSpecs.ts`, Test:
      `npm run build -w packages/api`)

- [x] Task 6: Move `packages/app/src/pipeline/lastSessionDetail.ts` + `.test.ts` to
      `packages/api/src/session/lastSessionDetail.ts` + `.test.ts` verbatim. It
      imports `matches` from `@dyel/pipeline` — keep as-is (engine-internal
      exception). Wire export into `index.ts`:
      `ts
    export { buildLastSessionDetail } from './session/lastSessionDetail';
    export type { LastSessionDetail } from './session/lastSessionDetail';
    `
      (Target: `packages/api/src/session/lastSessionDetail.ts`, Test:
      `npm test -w packages/api`)

- [x] Task 7: Move `packages/app/src/utils/variationSnapshot.ts` + `.test.ts` to
      `packages/api/src/variation/variationSnapshot.ts` + `.test.ts` verbatim. It
      imports `normalizeE1rm` (value) and `RechartsRow`/`NormalizationModel` (types)
      from `@dyel/pipeline` — `normalizeE1rm` is engine-internal normalization logic,
      keep that import as-is too (same exception category as `matches`). It also
      imports `roundWeight` from `../utils/weightUnit` — duplicate `roundWeight` (and
      its `convertWeight` dependency) as a small standalone function directly in this
      file or in a shared `packages/api/src/weightUnit.ts`, rather than importing
      across packages (see Task 9 for the same pattern). Wire export into `index.ts`:
      `ts
    export {
      snapshotVariationsFromPipeline,
      snapshotNormalizedVariationsFromPipeline,
    } from './variation/variationSnapshot';
    `
      (Target: `packages/api/src/variation/variationSnapshot.ts`, Test:
      `npm test -w packages/api`)

- [x] Task 8: Create `packages/api/src/variation/variationRadarSelectors.ts` with two
      functions extracted from the inline `for` loops in
      `packages/app/src/hooks/pipeline/usePipelineVariationRadarData.ts` (read that
      file first — the loops are near lines 80-93 and 107-117 as of this writing, but
      confirm current line numbers before extracting):
      ```ts
      import type { TaggedSetRecord } from '@dyel/pipeline';
      import { matches } from '@dyel/pipeline';

      export function buildCanonicalByLabel(
        tagged: TaggedSetRecord[],
        liftType: string
      ): Map<string, string> {
        const canonicalByLabel = new Map<string, string>();
        const dateByLabel = new Map<string, number>();
        for (const r of tagged) {
          if (!matches(r.tags, { all: [`lift:${liftType}`] })) {
            continue;
          }
          const label = r.meta?.rawExercise ?? r.canonical;
          const currentDate = dateByLabel.get(label) ?? -Infinity;
          if (r.date > currentDate) {
            dateByLabel.set(label, r.date);
            canonicalByLabel.set(label, r.canonical);
          }
        }
        return canonicalByLabel;
      }

      export function resolveTargetLabel(
        tagged: TaggedSetRecord[],
        liftType: string,
        targetCanonical?: string
      ): string | undefined {
        let targetLabel: string | undefined;
        let targetDate = -Infinity;
        for (const r of tagged) {
          if (r.canonical !== targetCanonical || !matches(r.tags, { all: [`lift:${liftType}`] })) {
            continue;
          }
          if (r.date > targetDate) {
            targetDate = r.date;
            targetLabel = r.meta?.rawExercise ?? r.canonical;
          }
        }
        return targetLabel;
      }
      ```
      Keep the `matches` import direct from `@dyel/pipeline` (engine-internal
      exception — do not route through `conjugate/facets.ts`). Add `.test.ts` with
      `it.each` matrices per root `CLAUDE.md` testing conventions covering: empty
      input, single matching record, multiple records with the same label picking the
      latest date, records for a different lift type being excluded, and (for
      `resolveTargetLabel`) no match for the given `targetCanonical`. Wire export into
      `index.ts`:
      ```ts
      export {
        buildCanonicalByLabel,
        resolveTargetLabel,
      } from './variation/variationRadarSelectors';
      ```
      (Target: `packages/api/src/variation/variationRadarSelectors.ts`, Test:
      `npm test -w packages/api`)

- [x] Task 9: Move `packages/app/src/utils/pipelineChartUtils.ts` + `.test.ts` to
      `packages/api/src/chart/pipelineChartUtils.ts` + `.test.ts` verbatim, including
      `formatChartDate`, `mergeRechartsRowsToChartPoints`, `mergeWideRechartsRows`,
      `mergeVolumeIntoChartPoints`, and the private `localDateKey` helper. The file
      imports `roundWeight` from `../utils/weightUnit` (`convertWeight`-based, kg →
      display-unit rounding). Duplicate `roundWeight` as a small standalone function
      in the same file (or a shared `packages/api/src/weightUnit.ts` used by both this
      file and Task 7/10 — prefer one shared file if multiple tasks need it, to avoid
      three near-identical copies):
      `ts
    export function roundWeight(kg: number, unit: 'lbs' | 'kg'): number {
      const KG_TO_LBS = 2.20462262185;
      return Math.round(unit === 'lbs' ? kg * KG_TO_LBS : kg);
    }
    `
      Wire export into `index.ts`:
      `ts
    export {
      mergeRechartsRowsToChartPoints,
      mergeWideRechartsRows,
      mergeVolumeIntoChartPoints,
      formatChartDate,
    } from './chart/pipelineChartUtils';
    `
      (Target: `packages/api/src/chart/pipelineChartUtils.ts`, Test:
      `npm test -w packages/api`)

- [x] Task 10: Move `packages/app/src/pipeline/repCalculatorUtils.ts` to
      `packages/api/src/repCalculator/repCalculatorUtils.ts` verbatim
      (`selectBestE1RMPoint`, `findBestE1RMFromPipeline`, `predictWeightForReps`,
      `predictRepsForWeight`, `convertE1RMToDisplayUnit`, `resolveE1RMEstimate`,
      `E1RMEstimate` type). It imports `invertE1RM`, `projectE1RMToDate` (values) and
      `Point`, `NormalizationModel` (types) from `@dyel/pipeline` — `invertE1RM`/
      `projectE1RMToDate` are engine normalization math, keep those imports as-is
      (same exception category as `matches`/`normalizeE1rm`). It also imports
      `convertWeight` from `../utils/weightUnit` — duplicate it as a small standalone
      function (see Task 9's `roundWeight` pattern; `convertWeight` is the
      un-rounded version):
      `ts
    function convertWeight(kg: number, unit: 'lbs' | 'kg'): number {
      const KG_TO_LBS = 2.20462262185;
      return unit === 'lbs' ? kg * KG_TO_LBS : kg;
    }
    `
      Add `.test.ts` since none currently exists — cover `selectBestE1RMPoint` (empty
      array, single point, multiple points picking max), `findBestE1RMFromPipeline`
      (exact match, variant-factor projection, missing baseline source name, missing
      variant factor), and `resolveE1RMEstimate` (no baseline, no baseline points,
      delegates correctly) using `it.each` matrices per root `CLAUDE.md` conventions.
      Wire export into `index.ts`:
      `ts
    export {
      selectBestE1RMPoint,
      findBestE1RMFromPipeline,
      predictWeightForReps,
      predictRepsForWeight,
      convertE1RMToDisplayUnit,
      resolveE1RMEstimate,
    } from './repCalculator/repCalculatorUtils';
    export type { E1RMEstimate } from './repCalculator/repCalculatorUtils';
    `
      (Target: `packages/api/src/repCalculator/repCalculatorUtils.ts`, Test:
      `npm test -w packages/api`)

- [x] Task 11: Create `packages/api/src/repCalculator/repCalculatorSelectors.ts`.
      Read the **current working-tree** (not last git commit — it has an uncommitted
      refactor on top of HEAD that's fine to extract from)
      `packages/app/src/components/shared/RepCalculator.tsx` and extract the following
      three functions from its `availableMagnitudes`, `exercisesForType`, and
      `effectiveCanonical` `useMemo` bodies (currently around lines 76-179, confirm
      current line numbers before extracting):

      ```ts
      import type { TaggedSetRecord } from '@dyel/pipeline';
      import { facetsFromTags, facetFamilyKey } from '../conjugate/facets';

      export function availableEquipmentMagnitudes(
        records: TaggedSetRecord[],
        selectedEquipment: string | null
      ): string[] {
        if (!selectedEquipment || !['board', 'blocks', 'deficit'].includes(selectedEquipment)) {
          return [];
        }
        const mags = records
          .map((r) => facetsFromTags(r.tags))
          .filter((f) => f.equipment === selectedEquipment && f.equipmentMagnitude)
          .map((f) => f.equipmentMagnitude!);
        return Array.from(new Set(mags)).sort((a, b) => {
          const [nA, nB] = [parseInt(a, 10), parseInt(b, 10)];
          return isNaN(nA) || isNaN(nB) ? a.localeCompare(b) : nA - nB;
        });
      }

      export function exercisesForLiftType(
        records: TaggedSetRecord[]
      ): { canonical: string; label: string }[] {
        const seen = new Map<string, { canonical: string; label: string }>();
        records.forEach((r) => {
          if (!seen.has(r.canonical)) {
            seen.set(r.canonical, { canonical: r.canonical, label: r.meta?.rawExercise ?? r.exercise });
          }
        });
        return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
      }

      export function resolveEffectiveCanonical(
        records: TaggedSetRecord[],
        params: {
          liftType: string;
          selectedRecord: TaggedSetRecord | undefined;
          selectedBar: string | null;
          selectedStance: string | null;
          selectedEquipment: string | null;
          selectedEquipmentMagnitude: string | null;
          selectedAddlWt: string | null;
        }
      ): string | null {
        const { liftType, selectedRecord, selectedBar, selectedStance, selectedEquipment,
          selectedEquipmentMagnitude, selectedAddlWt } = params;
        if (!selectedRecord) {
          return null;
        }
        if (liftType === 'accessory') {
          return selectedRecord.canonical;
        }
        const candidateKey = [
          liftType,
          selectedBar,
          selectedStance !== 'competition' && selectedStance,
          selectedEquipment,
        ]
          .filter(Boolean)
          .join('-');
        const match = records.find((rec) => {
          const fKey = facetFamilyKey(rec.canonical);
          const f = facetsFromTags(rec.tags);
          const keyMatch =
            fKey === candidateKey ||
            (f.bar === selectedBar &&
              f.stance === selectedStance &&
              f.equipment === selectedEquipment &&
              f.equipmentMagnitude === selectedEquipmentMagnitude);
          if (!keyMatch) {
            return false;
          }
          return selectedAddlWt ? f.addlWts.includes(selectedAddlWt) : f.addlWts.length === 0;
        });
        return match ? match.canonical : selectedRecord.canonical;
      }
      ```
      Note this calls `facetsFromTags`/`facetFamilyKey` from the **local**
      `../conjugate/facets` file added in Task 2 — not from `@dyel/pipeline` directly.
      Add `.test.ts` with `it.each` matrices covering: no equipment selected → empty
      magnitudes; equipment selected with/without matching records; duplicate
      canonicals collapsing to one entry in `exercisesForLiftType`; accessory lift
      type short-circuit; candidate-key exact match; facet-field fallback match; addlWt
      present/absent branches; no match falling back to `selectedRecord.canonical`.
      Wire export into `index.ts`:
      ```ts
      export {
        availableEquipmentMagnitudes,
        exercisesForLiftType,
        resolveEffectiveCanonical,
      } from './repCalculator/repCalculatorSelectors';
      ```
      (Target: `packages/api/src/repCalculator/repCalculatorSelectors.ts`, Test:
      `npm test -w packages/api`)

- [x] Task 12: Update `packages/api/CLAUDE.md`'s export table with all new Phase 1
      exports. Explicitly document the `matches`/`buildDatasetsFromModel`
      direct-import-from-`@dyel/pipeline` exception (name both functions, note which
      new files use them) right alongside the existing `parseSheetData`/
      `parseTextData` "raw-input entry point" exception note in the Convention
      section, so a future reader doesn't mistake it for an oversight. Remove the "not
      yet true in practice" caveat pointing at `PipelineApiBoundary.md`. (Target:
      `packages/api/CLAUDE.md`, Test: none — doc-only, verify by reading)

## Deferred cleanup (do NOT execute in this phase — tracked here so it isn't lost)

- [ ] Task 12b: Once `API_PHASE_2.md`'s Tasks 19, 20 have landed (repointing
      `StrengthScoreCalculator.tsx` and `ConjugateCharts.tsx` off direct
      `@dyel/pipeline` imports of `computeStrengthScores`/`LINE_COLORS`), delete
      `facetsFromTags`, `facetFamilyKey`, the `CONJUGATE_*` const arrays,
      `computeStrengthScores`, and `LINE_COLORS` from `packages/pipeline/src` (and
      their exports from `packages/pipeline/src/index.ts`). **Do not delete
      `classifyExerciseName`** from `packages/pipeline` — `@dyel/api`'s copy is a
      documented pass-through re-export (Task 3), not a duplicate, so pipeline's
      original stays forever as the actual implementation. Keep the `Conjugate*`
      **types** exported from pipeline too — types-only sharing is the intended end
      state, not a violation to clean up. This task (for the five deletable symbols)
      is what actually satisfies "`packages/pipeline` only contains what `runPipeline`
      needs" — Phase 1 alone does not achieve that on its own, it only stops
      `@dyel/api` from re-exporting pipeline's copies of those five. Add this as a new
      task to `API_PHASE_2.md` (or a short new phase between 2 and 3) once Phase 1
      lands, so it isn't forgotten. (Target: `packages/pipeline/src/tag/tag.ts`
      (`facetsFromTags`/`facetFamilyKey` only — leave `classifyExerciseName` in
      place), `packages/pipeline/src/tag/detect/conjugate-types.ts`,
      `packages/pipeline/src/derive/athlete.ts`, `packages/pipeline/src/utils/colors.ts`,
      `packages/pipeline/src/index.ts`, Test: `npm run build -w packages/pipeline &&
    npm test -w packages/pipeline && npm run build -w packages/app && npm test -w
    packages/app`)

## Verification

After every task: `npm run build -w packages/api && npm test -w packages/api`. This
phase never touches `packages/pipeline` or `packages/app` — `npm run build -w
packages/pipeline` should remain a no-op throughout, and `packages/app`'s build/tests
are untouched until Phase 2 (it should still pass unchanged, since nothing in
`packages/app` has been repointed yet).

## Next

Once this phase's tasks are complete and `packages/api`'s build/tests are green,
proceed to `API_PHASE_2.md`. Remember to add Task 12b (deferred pipeline cleanup) to
that phase's task list, or as a new short phase between 2 and 3, once Phase 2's
relevant tasks (17, 19, 20) are identified as landed.
