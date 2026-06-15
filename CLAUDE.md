# CLAUDE.md

This is an npm workspaces monorepo with two packages:

| Package           | Path             | Purpose                                                                |
| ----------------- | ---------------- | ---------------------------------------------------------------------- |
| `@dyel/core`      | `packages/core/` | Pure TypeScript domain logic — no React dependency; publishable to npm |
| `dyel-visualizer` | `packages/app/`  | React application that consumes `@dyel/core`                           |

## Commands (run from repo root)

```bash
npm run dev       # start the app dev server at http://localhost:5173
npm run build     # build @dyel/core (tsc), then vite build the app
npm test          # run tests in all packages
npm run lint      # eslint (covers all packages)
npm run format    # prettier --write (covers all packages)
```

The pre-commit hook runs `lint-staged` (eslint + prettier on staged files) then `npm test`.

## Package resolution

During development `packages/app/vite.config.ts` uses `resolve.alias` to point `@dyel/core` at `packages/core/src/index.ts` directly — no build step is needed for the core package during dev. `packages/app/tsconfig.app.json` has a matching `paths` entry so TypeScript also resolves from source.

To build `@dyel/core` for npm publishing (emits `dist/` with `.d.ts` declarations):

```bash
npm run build -w packages/core
```
