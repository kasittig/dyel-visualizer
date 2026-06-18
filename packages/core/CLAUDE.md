# CLAUDE.md

Pure TypeScript domain logic for the DYEL workout visualizer. No React dependency — safe to import from any TS/JS project.

## Public API

Everything re-exported from `src/index.ts` is public. Key exports:

| Category       | Exports                                                                                                                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types          | `ConjugateExercise`, `TrainingSession`, `ConjugateDataPair`, `ConjugateBar`, `ConjugateStance`, `ConjugateEquipment`, `ConjugateAddlWt`, `MovementCategory`, `DeadliftStancePreference`, `DiagnosticResult`, `PrimaryLift`, `EffectEnum` |
| Type helpers   | `variantLabel`, `familyKey`                                                                                                                                                                                                              |
| Parsing        | `parseConjugateData(csv): ConjugateDataPair[]`, `parseIndexCsv(csv): IndexEntry[]`                                                                                                                                                       |
| e1RM math      | `calcE1RM`, `invertE1RM`, `predictE1RM`, `fitVariantFactor`, `fitAddlWtOffset`, `normalizeToBaseE1RM`                                                                                                                                    |
| Filters        | `applyFilters`, `emptyFilters`, `FilterState`                                                                                                                                                                                            |
| Rep calculator | `findBestE1RM`, `predictWeightForReps`, `predictRepsForWeight`, `E1RMEstimate`, `RepCalcStats`                                                                                                                                           |
| Session stats  | `buildSessionStats`, `SessionStats`, `LastSession`                                                                                                                                                                                       |
| Chart data     | `buildChartData`, `ChartPoint`, `buildVariationChartData`, `VariationChartResult`, `NORMALIZED_KEY`                                                                                                                                      |
| Diagnostics    | `generateDiagnostics`, `toMovementCategory`, `DiagnosticsOptions`, `MODIFIER_EFFECTS`                                                                                                                                                    |
| Selections     | `defaultBaselineName`, `defaultTargetName`                                                                                                                                                                                               |
| Utilities      | `setsRepsLabel`, `formatDate`, `LINE_COLORS`                                                                                                                                                                                             |

## Movement category model

`ConjugateExercise.movementCategory` and `DiagnosticResult.category` are both `MovementCategory[]`. `toMovementCategory` collects into two independent dimensions:

- **ROM modifier** (lockout/bottom_range): from equipment (board/floor/blocks/rack → lockout; deficit/pause → bottom_range), certain stances (close/narrow/slingshot/builder → lockout), cambered bar squat, box squat
- **Movement pattern** (anchor/quad_dominant/posterior_chain): from stance and bar type

An exercise can carry both (e.g. deficit sumo deadlift → `["bottom_range", "posterior_chain"]`). `"anchor"` is only added when no ROM modifier is present — competition stance is the parser fallback and must not override equipment-based classification.

In `generateDiagnostics`, an exercise is treated as the anchor baseline only when its categories are exactly `["anchor"]`.

## Commands

```bash
npm test          # vitest run --passWithNoTests
npm run build     # tsc -p tsconfig.build.json  →  emits dist/ for publishing
```

## Publishing

The `exports` field in `package.json` points to `src/index.ts` for workspace use (Vite resolves TS directly). Build output goes to `dist/` (listed in `files`); that's what npm consumers get. Run `npm run build -w packages/core` from the repo root before publishing.
