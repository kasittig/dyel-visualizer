# Reconcile the `@dyel/api` "sole boundary" claim with reality

## Status: NOT STARTED

This is a scoping/architecture task, carried forward from `CoreDeprecation.md` (now
deleted — that effort finished and was removed from `migration/` per the "delete once
100% complete" convention; this is the one piece of it that was explicitly deferred
rather than completed). It was unblocked once `packages/core/` was fully deleted
(confirmed done — see `HANDOFF.md`), but has not been picked up yet.

## The problem

`packages/api/CLAUDE.md` states `@dyel/api` is "the sole boundary between
`packages/app` and `@dyel/pipeline` — app components/hooks must never import
`@dyel/pipeline` directly."

In practice, this is not true today: roughly 20 files in `packages/app` import
`@dyel/pipeline` directly, including:

- `App.tsx`
- several `components/charts/*.tsx`
- `hooks/pipeline/*.ts`
- `utils/rawInputUtils.ts`
- the validators added during the `@dyel/core` deprecation
  (`utils/validators/pipelineSheetValidator.ts`, `pipelineFreeformValidator.ts`)

This directly contradicts `packages/api/CLAUDE.md`'s "sole boundary" claim — and also
contradicts `packages/app/CLAUDE.md`'s own MVC section, which documents
`hooks/pipeline/*` as a legitimate direct-`@dyel/pipeline`-consuming "Controller"
layer. The two docs currently disagree with each other and with reality.

## Before touching any files

This needs its own scoping pass first, to decide which doc is right:

1. **Option A**: Move everything currently importing `@dyel/pipeline` directly from
   `packages/app` behind `@dyel/api`, making the "sole boundary" claim literally true.
2. **Option B**: Walk back `packages/api/CLAUDE.md`'s "sole boundary" claim to match
   the already-documented Controller-layer convention in `packages/app/CLAUDE.md`.

Do not start implementation until one of these is chosen and signed off — this is an
architecture decision, not a mechanical migration.

## Verification (once scoped)

Whichever option is chosen, re-run the full workspace suite as the acceptance bar:

```
npm run build -w packages/pipeline && npm run build -w packages/api && npm run build -w packages/app
npm test -w packages/pipeline && npm test -w packages/api && npm test -w packages/app
```
