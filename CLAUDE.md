# CLAUDE.md - npm Workspace Monorepo

## Workspace Architecture

- Package Manager: npm Workspaces
- Pipeline Types Package Name: `@dyel/pipeline` maps directly to `packages/pipeline/`
- Shared Core Package Name: `@dyel/core` maps directly to `packages/core/`
- Application Package Name: `@dyel/app` maps directly to `packages/app/`

## Core Commands (Run from Root)

- Build Pipeline Types: `npm run build -w packages/pipeline`
- Build Shared Core: `npm run build -w packages/core`
- Build Vite App: `npm run build -w packages/app`
- Start App Dev: `npm run dev -w packages/app`

## Strict Importing Rules

- Any package that needs pipeline types (`SetRecord`, `Point`, `TagQuery`, `Unit`) must import from `@dyel/pipeline`, never a relative path traversal.
- Inside `packages/app`, always import shared modules from `@dyel/core`.
- **CRITICAL:** Do NOT use relative path traversals (like `../../core`) to share code.
- If changes are made to `@dyel/core`, you must explicitly prompt Claude to run `npm run build --workspace=@dyel/core` before testing `@dyel/app`.

## Git

- Never commit directly to `main`. Always create a new feature branch before committing.
- Base your feature branches off of `main` unless told otherwise.
- Keep your branch in sync with `git rebase main`
- Submit any changes as a new PR. If you are given a Github issue number, make sure your PR includes the phrase "solves #issue".
