# CLAUDE.md

`@dyel/api` is the sole boundary between `packages/app` and `@dyel/pipeline`. App
components and hooks must never import `@dyel/pipeline` directly — only from `@dyel/api`.

## Convention

One exported function per app component that needs pipeline-derived data. Functions here
take a `PipelineModel` (already computed by the app's `PipelineProvider`) plus any
component-specific params (date range, display unit, etc.), and return plain data —
no React dependency in this package.

## Commands

```bash
npm test          # vitest run --passWithNoTests
npm run build     # tsc -p tsconfig.build.json
```
