# CLAUDE.md

Pure TypeScript domain logic for the DYEL workout visualizer. No React dependency — safe to import from any TS/JS project.

## Public API

Everything re-exported from `src/index.ts` is public. Key exports:

| Category       | Exports                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Types          | `ConjugateExercise`, `TrainingSession`, `ConjugateDataPair` (and constituent bar/stance/equipment/addlWt types) |
| Parsing        | `parseConjugateData(csv: string): ConjugateDataPair[]`                                                          |
| e1RM math      | `calcE1RM`, `invertE1RM`, `predictE1RM`, `fitVariantFactor`, `fitAddlWtOffset`                                  |
| Filters        | `applyFilters`, `emptyFilters`, `FilterState`                                                                   |
| Rep calculator | `findBestE1RM`, `predictWeightForReps`, `predictRepsForWeight`, `E1RMEstimate`, `RepCalcStats`                  |
| Utilities      | `setsRepsLabel`, `formatDate`, `LINE_COLORS`, `familyKey`, `variantLabel`                                       |

## Commands

```bash
npm test          # vitest run --passWithNoTests
npm run build     # tsc -p tsconfig.build.json  →  emits dist/ for publishing
```

## Publishing

The `exports` field in `package.json` points to `src/index.ts` for workspace use (Vite resolves TS directly). Build output goes to `dist/` (listed in `files`); that's what npm consumers get. Run `npm run build -w packages/core` from the repo root before publishing.
