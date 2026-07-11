# App Refactor Migration: Feature Organization + Unidirectional Data Flow

Goal: all business logic in `@dyel/api`, `packages/app` organized by domain feature, components strictly render-only. Data flows one direction: data source → `runPipelineModel` → `PipelineModel` context → feature hooks (all derivation via `@dyel/api`) → components → user events → top-level state.

## Phases (strictly in order; each phase = one branch off `main` + one PR)

| Phase | File                                                                   | Branch                 | Touches                       |
| ----- | ---------------------------------------------------------------------- | ---------------------- | ----------------------------- |
| 1     | [phase-1-api-additions.md](phase-1-api-additions.md)                   | `app-refactor-phase-1` | `packages/api` only           |
| 2     | [phase-2-render-only-components.md](phase-2-render-only-components.md) | `app-refactor-phase-2` | app hooks + components        |
| 3     | [phase-3-app-decomposition.md](phase-3-app-decomposition.md)           | `app-refactor-phase-3` | App.tsx + eslint allowlist    |
| 4     | [phase-4-feature-restructure.md](phase-4-feature-restructure.md)       | `app-refactor-phase-4` | file moves only               |
| 5     | [phase-5-enforcement-docs.md](phase-5-enforcement-docs.md)             | `app-refactor-phase-5` | eslint rules + CLAUDE.md docs |

## Invariants for every task (paste into every delegation)

- Never import `@dyel/pipeline` from `packages/app/src` (ESLint-enforced; exceptions shrink during this migration). App code imports `@dyel/api` only.
- Never use relative paths that traverse across packages.
- `@dyel/api` code: pure TypeScript, no React, no DOM/browser APIs, named exports only, colocated `*.test.ts` (vitest), every new export added to `packages/api/src/index.ts` (curated barrel — explicit names, no `export *`) AND to the export table in `packages/api/CLAUDE.md`.
- Naming: `*Selectors.ts` = derive options from records + user selections; `*Utils.ts` = stateless transforms; verb prefixes `build*/compute*/detect*/collect*`.
- Code style (root CLAUDE.md): native ops (`Map.groupBy`, `?.`, `??`), consolidated single-pass loops, keep single-line calculations inline (do NOT over-extract one-liners).
- Tests: `it.each` matrices with a descriptive first column, factory functions with overrides (`as any` OK in tests), inline assertions (no `const rows = run()` temporaries).
- Always `{ }` after if/else (ESLint `curly`).
- Commands (from repo root): build `npm run build -w packages/api` / `-w packages/app` / `-w packages/pipeline`; test `npm run test -w <pkg>` (vitest).

## Per-phase completion checklist (team-lead runs, not delegated)

1. All three packages build; all tests green (baselines at migration start: pipeline 157, api 125, app 133 — log deltas).
2. `npx eslint packages/app packages/api` clean.
3. Manual smoke via the run-dyel-visualizer skill (dev server localhost:5173; leave it running afterward).
4. Append a phase entry to root `HANDOFF.md` (what moved, test-count delta).
5. PR to `main` referencing this migration.
