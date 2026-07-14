# HANDOFF.md

## Context

Implementing GitHub issue #486 on branch `issue-486-accessory-subtypes`: label accessory
("unknown") exercises with one of three subtypes — `accessory:upper`, `accessory:lower`,
`accessory:core` — based on same-day comp-lift context (bench-only day → upper,
squat/deadlift-only day → lower, core-keyword match → core regardless of day, ambiguous/no
context → no subtype, same "accept and report" philosophy as the existing unknown heuristic).

This is a pure `@dyel/pipeline` change (tag stage). No `packages/api` or `packages/app` changes
were in scope per the issue text, and none were made.

## Progress Overview

- Added `CORE_PATTERN` / `isCoreExercise()` to `packages/pipeline/src/tag/detect/detectors.ts` —
  word-boundary regex over common ab/core keywords.
- Added `buildAccessoryTaggedRecords()` to `packages/pipeline/src/tag/tag.ts` — builds real
  `TaggedSetRecord`s for names `tagRecords` reports as `unknown`, so accessory data still flows
  into `PipelineModel.tagged` without touching normalization/points/diagnostics (which stay
  scoped to comp-lift records).
- Added `classifyAccessorySubtypes()` to the same file — post-processes already-tagged records,
  grouping by `date` (via `Map.groupBy`) to add `accessory:core`/`accessory:upper`/
  `accessory:lower` tags per the rules above.
- Wired both into `runPipelineModel` in `packages/pipeline/src/pipeline.ts`: comp-lift tagging
  (`compTagged`) stays the input to normalization/derivers, while `tagged` (exposed on
  `PipelineModel`) is `compTagged` + accessory records, subtype-classified.
- Exported `classifyAccessorySubtypes` and `buildAccessoryTaggedRecords` from
  `packages/pipeline/src/index.ts`.
- Updated `packages/pipeline/src/tag/CLAUDE.md` with a new "Accessory subtype classification"
  section documenting the design/rationale, and the contract block with the new function
  signature.
- Added test coverage in `packages/pipeline/src/tag/tag.test.ts` and
  `packages/pipeline/src/pipeline.test.ts`.
- Fixed one lint violation (missing curly braces on an early-return `if`, per repo ESLint
  `curly` rule) in `classifyAccessorySubtypes`.

## Decisions Made & Rationale

- **Subtype classification is a separate post-pass, not folded into `buildTagsAndEffects`.**
  Determining upper/lower requires knowing what else was logged on the same day — context a
  single-record tagging function (`buildTagsAndEffects`) doesn't have. See `tag/CLAUDE.md`.
- **Core-keyword check takes priority over day-context.** Per the issue text ("Core exercises
  can be done on either day"), core classification never depends on what else was logged.
- **Ambiguous days (both bench and squat/deadlift, or neither) get no subtype tag.** Treated as
  an accepted limitation analogous to the existing unknown-exercise heuristic, rather than
  guessing.
- **`resolveCanonicalNames`/`tagRecords` are left untouched** — they still report every
  accessory name via `unknown` for offline review. `buildAccessoryTaggedRecords` is an
  intentional, additive counterpart that does NOT filter, so `PipelineModel.tagged` can include
  real accessory records without changing existing unknown-reporting behavior or touching
  normalization.

## Open TODOs

- Verify the branch is rebased on current `main` before opening a PR (`git fetch --dry-run`
  hasn't been checked this session).
- Decide whether `packages/api`/`packages/app` need follow-up work to actually surface
  `accessory:upper`/`accessory:lower`/`accessory:core` in the UI (out of scope for #486 as
  written, but worth confirming with the user before closing the loop).
- Open a PR referencing "closes #486" once the above is confirmed. Do not close the issue
  directly — the PR merge will close it.

## Files Touched

- `packages/pipeline/src/index.ts`
- `packages/pipeline/src/pipeline.ts`
- `packages/pipeline/src/pipeline.test.ts`
- `packages/pipeline/src/tag/CLAUDE.md`
- `packages/pipeline/src/tag/detect/detectors.ts`
- `packages/pipeline/src/tag/tag.ts`
- `packages/pipeline/src/tag/tag.test.ts`

## Suggested Next Skills

- None required immediately — build/lint/tests are all green (`npm run build -w
packages/pipeline`, `npm run build -w packages/api`, `npm run build -w packages/app`, `npm run
lint`, `npx vitest run --root packages/pipeline` all pass as of this session). Next step is a
  PR, not another implementation skill.
