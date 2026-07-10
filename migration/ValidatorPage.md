# ValidatorPage Migration — COMPLETED

The validator has been migrated to use `@dyel/pipeline` backend validation.

## Implementation Summary

### Created Files

1. **`packages/app/src/utils/validators/pipelineSheetValidator.ts`** — Pipeline-native CSV sheet validator using Papa Parse (same as pipeline's csvParser)
2. **`packages/app/src/utils/validators/pipelineFreeformValidator.ts`** — Pipeline-native freeform text validator
3. **Test files** — `pipelineSheetValidator.test.ts` and `pipelineFreeformValidator.test.ts` with `it.each` test matrices

### Changed Files

1. **`packages/app/src/hooks/infra/useSheetValidation.ts`** — Updated to import from `pipelineSheetValidator`
2. **`packages/app/src/hooks/infra/useTextValidation.ts`** — Updated to import from `pipelineFreeformValidator`
3. **`packages/app/src/components/pages/ValidatorPage.tsx`** — Updated to import types from local validators instead of `@dyel/core`

### Key Decisions

- **Validators live in app layer** (`packages/app/src/utils/validators/`) — not exported from pipeline, as they're UI-specific validation helpers, not core pipeline functionality
- **Text validator requires YYYY-MM-DD dates** — aligned with pipeline's freeform parser strict format requirement (breaking change from legacy behavior, but validates against actual pipeline input expectations)
- **CSV validator uses Papa Parse directly** — matches pipeline's internal CSV parsing, validates column structure without replicating parsing logic
- **Exercise name detection uses `@dyel/pipeline`'s `classifyExerciseName`** — added as a small, additive export on `tag.ts` (wrapping the existing internal `parseExercise`) specifically so these validators wouldn't need to reach into `@dyel/core`'s `nameToExercise`. Zero `@dyel/core` dependency remains in either validator.
- **Output shapes preserved** — `SheetValidationResult`, `ColumnInfo`, `TextValidationResult` types unchanged, so UI rendering logic requires no changes

### Testing

All validator tests pass:

- `pipelineSheetValidator.test.ts`: 10 tests covering missing columns, invalid data, required fields
- `pipelineFreeformValidator.test.ts`: 10 tests covering date format, line parsing, exercise detection

### Verification

```bash
npm run build -w packages/pipeline  # ✓
npm run build -w packages/app       # ✓
npm test -w packages/app            # ✓ (all tests pass)
```
