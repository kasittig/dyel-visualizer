# CLAUDE.md - npm Workspace Monorepo

## Workspace Architecture

- Package Manager: npm Workspaces
- Shared Core Package Name: `@dyel/core` maps directly to `packages/core/`
- Application Package Name: `@dyel/app` maps directly to `packages/app/`

## Core Commands (Run from Root)

- Build Shared Core: `npm run build -w packages/core`
- Build Vite App: `npm run build -w packages/app`
- Start App Dev: `npm run dev -w packages/app`

## Strict Importing Rules

- Inside `packages/app`, always import shared modules from `@dyel/core`.
- **CRITICAL:** Do NOT use relative path traversals (like `../../core`) to share code.
- If changes are made to `@dyel/core`, you must explicitly prompt Claude to run `npm run build --workspace=@dyel/core` before testing `@dyel/app`.
