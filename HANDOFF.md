# HANDOFF: @dyel/core deprecation (migration-phase-1)

## Background

Full plan and history live in `migration/CoreDeprecation.md` — this file is just the
live status tracker for team-lead-coordinated execution. Goal: fully remove
`@dyel/core` from the workspace once `@dyel/pipeline`/`@dyel/api` cover its
functionality.

## Task list (this session)

- [x] Task 1: Migrate `parseTextData` off `@dyel/core` — replaced
      `extractTextLines`/`textLineToRow`/`nameToExercise`/`parseSession`/
      `detectWeightUnit` with `@dyel/pipeline`-native `classifyExerciseName`/
      `calcE1RM` + local parsing logic (Target: `packages/api/src/text/parseTextData.ts`,
      `packages/api/src/text/parseTextData.test.ts`)
- [x] Task 2: Delete confirmed-dead `@dyel/core`-dependent code in `packages/api` —
      `filterByDateRange`, `buildChartData`, and the non-Tagged half of `volume.ts`
      (Target: `packages/api/src/filters/`, `packages/api/src/chart/`,
      `packages/api/src/volume/volume.ts`, `packages/api/src/index.ts`) — ran in
      parallel with Task 1
- [x] Task 3: Remove the dead `__MODIFIER__EFFECTS__`/`__COEFFICIENTS__`
      global-injection mechanism (Target: `global.d.ts`, `packages/app/vite.config.ts`,
      `packages/app/vitest.config.ts`) — ran in parallel with Tasks 1/2
- [x] Task 4: Final removal — deleted `packages/core/` entirely; dropped the
      `@dyel/core` dependency/alias/path entries from `packages/app`'s
      `package.json`/`tsconfig.app.json`/`vite.config.ts` and root `package.json`'s
      build script; updated root `CLAUDE.md` (Target: `packages/core/` (deleted),
      `packages/app/package.json`, `packages/app/tsconfig.app.json`,
      `packages/app/vite.config.ts`, root `package.json`, root `CLAUDE.md`) — blocked
      by Tasks 1-3, ran after they completed
- [x] Task 5: Doc cleanup — fixed `packages/app/CLAUDE.md:80`'s dangling reference to
      the already-deleted parity-test exception (Target: `packages/app/CLAUDE.md`) —
      ran independently, any time

## Status

**All tasks (1-5) DONE. `@dyel/core` is fully removed from the workspace.**

Task 4 surfaced one unplanned issue: `packages/pipeline/src/parse/csv.ts` uses
`papaparse` but never declared it in `packages/pipeline/package.json` — it only
resolved because npm workspaces hoisted it from `packages/core`'s dependency list (a
phantom dependency). Deleting `packages/core` broke `packages/pipeline`'s build/tests
until this was found and fixed by adding `papaparse`/`@types/papaparse` directly to
`packages/pipeline/package.json`.

Final verification (independently re-run via `qa-reviewer`, not just agent-reported),
from a clean `npm install`:

- `npm run build -w packages/pipeline`: clean
- `npm run build -w packages/api`: clean
- `npm run build -w packages/app`: clean
- `npm test -w packages/pipeline`: 181/181 passing
- `npm test -w packages/api`: 39/39 passing
- `npm test -w packages/app`: 166/166 passing
- **Total: 386/386 tests passing, no regressions**

`migration/CoreDeprecation.md`'s "Done" list now covers steps 1-11 (all of Core's
migration work); its "Remaining" section is empty. Changes are uncommitted on
`migration-phase-1` as of this handoff — not yet committed (only committing when the
user explicitly asks, per repo convention).

## Next up (not started this session)

The only work left per `CoreDeprecation.md` is the explicitly **deferred** effort,
now unblocked since `packages/core` is deleted:

Reconciling `@dyel/api`'s own `CLAUDE.md` claim that it's "the sole boundary between
`packages/app` and `@dyel/pipeline`" against the ~20 files in `packages/app` that
already import `@dyel/pipeline` directly (`App.tsx`, several `components/charts/*.tsx`,
`hooks/pipeline/*.ts`, `utils/rawInputUtils.ts`, the validators, etc.) — and against
`packages/app/CLAUDE.md`'s own MVC "Controller layer" section, which documents this as
intentional. The two docs currently disagree with each other and with reality. This
needs its own scoping pass to decide which doc is right (move everything behind
`@dyel/api`, or walk back the "sole boundary" claim) before any implementation starts
— see `CoreDeprecation.md`'s "Deferred" section for full detail.
