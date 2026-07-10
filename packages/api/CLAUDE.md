# CLAUDE.md

`@dyel/api` should be the sole boundary between `packages/app` and `@dyel/pipeline`. App
components and hooks should never import `@dyel/pipeline` directly — only from `@dyel/api`.
**Not yet true in practice** — see `migration/PipelineApiBoundary.md` at the repo root for
the ~20 files in `packages/app` that currently import `@dyel/pipeline` directly, and the
scoping decision needed before that's reconciled.

## Convention

Most exported functions take pipeline-derived data (a `PipelineModel`, or a slice of one
like `TaggedSetRecord[]`) plus component-specific params (date range, display unit, etc.),
and return plain data — no React dependency in this package. `parseSheetData`/
`parseTextData` are a deliberate, documented exception: they take raw input (a CSV string /
pasted text) instead, because their job is to _produce_ a model in the first place — they
call `runPipelineModel` internally rather than receiving an already-computed one.

## Exports (`src/index.ts`)

| Export                                                               | File                       | Signature                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCompetitionTotal`                                                | `getCompetitionTotal.ts`   | `(model: PipelineModel, dateRange, unit) => number \| null` — most recent squat+bench+deadlift total in range                                                                                                  |
| `calculateVolumeCorrelationFromTagged`                               | `volume/volume.ts`         | `(records: TaggedSetRecord[], unit) => Map<string, number>` — tonnage per calendar date                                                                                                                        |
| `parseTextData`                                                      | `text/parseTextData.ts`    | `(pastedText: string) => ...` — raw-input entry point (see Convention above)                                                                                                                                   |
| `TOTAL_CHART_SPECS`                                                  | `totalChartSpecs.ts`       | `DatasetSpec[]` data, consumed by `getCompetitionTotal`/`TotalChart`                                                                                                                                           |
| `LiftType`, `SplitRows` (types), `parseSheetData`, `groupByLiftType` | `sheet/parseSheetData.ts`  | `parseSheetData(csv, athlete) => Record<LiftType, SplitRows>` — raw-input entry point (see Convention above); `groupByLiftType(tagged)` does the same grouping/effort-split from an already-tagged record list |
| `defaultCompExerciseCanonical`                                       | `sheet/defaultExercise.ts` | `(records: TaggedSetRecord[], deadliftStance?) => string \| null`                                                                                                                                              |

## Commands

```bash
npm test          # vitest run --passWithNoTests
npm run build     # tsc -p tsconfig.build.json
```
