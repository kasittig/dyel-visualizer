# lifts/

Default selection logic and deadlift-stance resolution.

## Files

- **`defaultSelections.ts`** — `defaultBaselineName(rows)` picks the initial baseline: most recent by date, then e1RM. `defaultCompExerciseName(rows, deadliftStance)` picks the initial target: prefers paused bench, then any clean competition-stance exercise (falling back to competition-stance deadlift matching the user's stance), then the first row.
- **`resolveDeadliftStance.ts`** — `resolveDeadliftStance(ex, deadliftStance)` resolves a deadlift's actual stance (`'sumo'` | `'conventional'`), accounting for `'opposite'` and `null` stances relative to the user's primary preference.

## Key invariant — `__MODIFIER__EFFECTS__`

`resolveDeadliftStance.ts` is called by `load/generateDiagnostics.ts`, which references `__MODIFIER__EFFECTS__` as a global. It is **not** a runtime import — it is injected by the Vite build via `vite.config.ts` `define`. The type declaration lives in `global.d.ts` at the repo root. The triple-slash reference at the top of `resolveDeadliftStance.ts` pulls in that declaration for `tsc`.
