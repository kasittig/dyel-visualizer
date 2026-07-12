// Deliberate exception to @dyel/api's "no pipeline re-exports" rule: classifyExerciseName
// wraps pipeline's internal parseExercise detector, which isn't safely duplicable outside
// packages/pipeline (see migration/API_PHASE_1.md's Design decisions section).
export { classifyExerciseName } from '@dyel/pipeline';
