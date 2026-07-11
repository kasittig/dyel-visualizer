# Phase 5 — Lint enforcement + documentation

Objective: make the unidirectional-flow rules machine-enforced (zero new dev dependencies) and rewrite the docs so future work follows the architecture by default.

Prerequisite: Phases 1–4 merged.

---

## Task 5.1 — ESLint: components cannot import @dyel/api values

- Read: `eslint.config.js` (the existing `packages/app` no-restricted-imports blocks).
- Add a block for `packages/app/src/{features,shared}/**/*.tsx` (component files) using `@typescript-eslint/no-restricted-imports` with `allowTypeImports: true` banning value imports from `@dyel/api` — components may import api TYPES but not derivation functions.
- Add an override allowing `packages/app/src/shared/charts/**` (legitimately imports display helpers `formatChartDate`, `LINE_COLORS`). If other display-constant imports fire, allowlist them explicitly with a comment rather than weakening the rule.
- Done when: `npx eslint packages/app` clean; temporarily adding `import { buildChartDatasets } from '@dyel/api'` to a component makes it fail, then revert.

## Task 5.2 — ESLint: cross-feature isolation

- In the same config, add for `packages/app/src/features/**` a `no-restricted-imports` `patterns` entry blocking relative traversal into sibling features (e.g. pattern `../*/…` escaping the feature dir, message pointing to the CLAUDE.md convention). Features may import: `@dyel/api`, `shared/`, `app/` types, other features via their `index.ts` barrel only.
- This is the zero-dep approximation (decided: no eslint-plugin-import-x); the written convention in Task 5.3 carries the rest.
- Done when: eslint clean; a deliberate `import X from '../sigma/SigmaChart'` inside `features/lift/` fails, then revert.

## Task 5.3 — Rewrite `packages/app/CLAUDE.md`

Replace the MVC section with the unidirectional contract:

- Flow: data source → `usePipelineOrchestration` (`buildPipelineModel` via `@dyel/api`) → `PipelineModel` in `PipelineContext` → feature hooks (all derivation via `@dyel/api`) → render-only components → user events → handler props → state in `app/useAppSettings`.
- Components: render props/hook results only; no `useMemo` over model data; no `@dyel/api` value imports (types OK); never call `usePipelineModel()` — only feature hooks do.
- Feature hooks: the only context consumers; call `@dyel/api` for derivation; own React lifecycle only.
- State: app-wide in `useAppSettings`; feature-local UI state (popover open, calculator inputs, selected variation) stays in the feature.
- New derivations: add to `@dyel/api` first (with test + barrel + CLAUDE.md table entry), then a thin hook.
- Directory map of `app/`, `features/*`, `shared/*` with one line each.

## Task 5.4 — `packages/api/CLAUDE.md` final pass

- Verify the export table lists every export added in Phase 1 (barrel diff vs table).
- Confirm `buildPipelineModel`/`validatePipelineRun` are documented under the raw-input entry-point exception, and `validateSheetCsv`/`validateTextData` + the papaparse dependency are noted.

## Task 5.5 — HANDOFF.md closure + root pointer

- Append a closing entry to root `HANDOFF.md`: phases 1–5 summary, final test counts vs baselines (pipeline 157 / api 125 / app 133 at start), the two remaining sanctioned `@dyel/pipeline` touchpoints (api internals + the one allowlisted test).
- If root `CLAUDE.md`'s importing-rules section references paths that moved, update it.
- Optionally delete `migration/` or mark it done (team-lead's call).

---

## Phase verification (team-lead)

1. `npx eslint packages/app packages/api` clean.
2. Both deliberate-violation checks from 5.1/5.2 performed and reverted.
3. Full build + test across packages; final smoke via run-dyel-visualizer.
