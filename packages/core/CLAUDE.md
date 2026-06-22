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
| Filters        | `applyFilters`, `emptyFilters`, `FilterState`                                                                                                                                                    |
| Rep calculator | `findBestE1RM`, `predictWeightForReps`, `predictRepsForWeight`, `E1RMEstimate`, `RepCalcStats`                                                                                                   |
| Session stats  | `buildSessionStats`, `SessionStats`, `LastSession`                                                                                                                                               |
| Chart data     | `buildChartData`, `ChartPoint`, `buildVariationChartData`, `VariationChartResult`, `NORMALIZED_KEY`                                                                                              |
| Diagnostics    | `generateDiagnostics`                                                                                                                                                                            |
| Selections     | `defaultBaselineName`, `defaultTargetName`                                                                                                                                                       |
| Utilities      | `setsRepsLabel`, `formatDate`, `LINE_COLORS`                                                                                                                                                     |

## utils/ subdirectory layout

`src/utils/` is organized into four subdirectories by data-flow layer. Each has its own `CLAUDE.md`.

| Directory  | Responsibility                                                        |
| ---------- | --------------------------------------------------------------------- |
| `math/`    | Epley formula, session-grid interpolation, variant factor/offset math |
| `parsing/` | CSV ingestion, exercise name detection, sheet validation              |
| `stats/`   | Session aggregation, diagnostics, filtering, default selections       |
| `chart/`   | Chart data builders, grid helpers, display utilities                  |

Data flows in order: `parsing/` → `math/` → `stats/` → `chart/`. Dependencies only go forward (or sideways within a layer) — `math/` does not import from `stats/` or `chart/`.

## Commands

```bash
npm test          # vitest run --passWithNoTests
npm run build     # tsc -p tsconfig.build.json  →  emits dist/ for publishing
```

## Publishing

The `exports` field in `package.json` points to `src/index.ts` for workspace use (Vite resolves TS directly). Build output goes to `dist/` (listed in `files`); that's what npm consumers get. Run `npm run build -w packages/core` from the repo root before publishing.
