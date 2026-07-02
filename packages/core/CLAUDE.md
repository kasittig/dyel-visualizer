# CLAUDE.md

Pure TypeScript domain logic for the DYEL workout visualizer. No React dependency — safe to import from any TS/JS project.

## Public API

Everything re-exported from `src/index.ts` is public. Key exports:

| Category       | Exports                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Types          | `ConjugateExercise`, `TrainingSession`, `ConjugateDataPair`, `ConjugateBar`, `ConjugateStance`, `ConjugateEquipment`, `ConjugateAddlWt`, `DeadliftStancePreference`, `PrimaryLift`, `EffectEnum` |
| Type helpers   | `variantLabel`, `familyKey`                                                                                                                                                                      |
| Parsing        | `parseConjugateData(csv): ConjugateDataPair[]`, `parseIndexCsv(csv): IndexEntry[]`                                                                                                               |
| e1RM math      | `calcE1RM`, `invertE1RM`, `predictE1RM`, `fitVariantFactor`, `fitAddlWtOffset`, `normalizeToBaseE1RM`                                                                                            |
| Volume math    | `calculateVolumeCorrelation`                                                                                                                                                                     |
| Filters        | `filterByDateRange`                                                                                                                                                                              |
| Rep calculator | `findBestE1RM`, `predictWeightForReps`, `predictRepsForWeight`, `E1RMEstimate`, `RepCalcStats`                                                                                                   |
| Session stats  | `buildSessionStats`, `SessionStats`, `LastSession`                                                                                                                                               |
| Chart data     | `buildChartData`, `ChartPoint`, `buildVariationChartData`, `VariationChartResult`, `NORMALIZED_KEY`                                                                                              |
| Diagnostics    | `generateDiagnostics`                                                                                                                                                                            |
| Selections     | `defaultBaselineName`, `defaultCompExerciseName`                                                                                                                                                 |
| Utilities      | `setsRepsLabel`, `formatDate`, `LINE_COLORS`                                                                                                                                                     |

## src/ top-level layout

`src/` is organized ETL-style: `extract/`, `transform/`, and `load/` sit alongside `utils/` and `types/`. Each has its own `CLAUDE.md`.

| Directory    | Responsibility                                                                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extract/`   | Raw CSV ingestion — finding header rows, parsing rows, no domain knowledge                                                                                           |
| `transform/` | Pure functions turning raw rows into structured data (exercise detection, session parsing, sheet validation); `transform/parsers/` holds its row/field-level helpers |
| `load/`      | Serving transformed data to `@dyel/app` components (chart data builders, diagnostics)                                                                                |
| `types/`     | Shared domain types (`ConjugateExercise`, `TrainingSession`, etc.), the `RawRow` shape, and exercise-name detector tables                                            |

Data flows in order: `extract` -> `transform` -> `load`. Dependencies are only within a layer - any shared dependencies should be extracted into `utils/`.

## utils/ subdirectory layout

`src/utils/` is organized into subdirectories by data-flow layer. Each has its own `CLAUDE.md`.

| Directory | Responsibility                                                        |
| --------- | --------------------------------------------------------------------- |
| `math/`   | Epley formula, session-grid interpolation, variant factor/offset math |
| `stats/`  | Session aggregation, cross-exercise e1RM estimation, filtering        |
| `lifts/`  | Default baseline/target selection, deadlift stance resolution         |
| `chart/`  | Chart grid helpers and display utilities                              |

Dependencies are only within a layer - `math/` does not import from `stats/`, `lifts/`, or `chart/`.

## Commands

```bash
npm test          # vitest run --passWithNoTests
npm run build     # tsc -p tsconfig.build.json  →  emits dist/ for publishing
```

## Publishing

The `exports` field in `package.json` points to `src/index.ts` for workspace use (Vite resolves TS directly). Build output goes to `dist/` (listed in `files`); that's what npm consumers get. Run `npm run build -w packages/core` from the repo root before publishing.
