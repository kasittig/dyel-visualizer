# features/calculator

Rep and strength-score calculator components and hooks.

| File                          | Purpose                                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RepCalculator.tsx`           | Render-only Rep Calculator UI; logic owned by `usePipelineRepCalculator` hook                                                                                     |
| `StrengthScoreCalculator.tsx` | Strength score calculator computing Wilks, DOTS, and Schwartz-Malone scores via `useStrengthScores` hook and `@dyel/api`                                          |
| `usePipelineRepCalculator.ts` | Full Rep Calculator controller hook: owns lift-type/exercise/conjugate-facet/reps/weight state, derives e1RM via `usePipelineModel()` and `@dyel/api` selectors   |
| `useStrengthScores.ts`        | Computes strength scores (Wilks, DOTS, Schwartz-Malone) by reading pipeline model; accepts bodyweight/unit/gender arguments and returns competitionTotal + scores |
