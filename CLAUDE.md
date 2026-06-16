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

## Working Preferences

**Git workflow**

- Never commit directly to `main`. Always create a feature branch first (`feat/short-description` or `issue-NNN-short-description`). If new work depends on unmerged changes, branch off the relevant feature branch, not `main`.
- Before deleting any local branch that has a remote, run `gh pr list --state open --json headRefName` first and confirm no open PR points to it. A `git branch -d` "merged to refs/remotes/origin/..." warning does NOT mean the PR was merged — three branches in this repo were lost this way (fix/merge-exercise-lists, feat/conjugate-weight-calculator, feature/issue-62-chain-coefficient).
- Never use `--admin` or any flag to bypass branch protection rules on `gh pr merge`. If a merge is blocked, surface the specific blocker to the user.
- Never cherry pick changes. If work depends on changes on a different feature branch, rebase your branch on top of that feature branch.
- Never close a GitHub issue until its PR has merged. Use `Closes #NNN` in the PR description — GitHub closes the issue automatically on merge.

**Pull requests**

- Always include a **"What the user will see"** section in PR descriptions for observable, user-facing changes. If no user-visible changes, note that explicitly ("No user-visible changes."). Update the description whenever new commits are pushed.
- `gh pr edit --body` silently fails on this repo due to a Projects (classic) deprecation warning. Use the API directly instead:
  ```bash
  gh api repos/kasittig/dyel-visualizer/pulls/<number> --method PATCH --field body="<body>" --jq .number
  ```

**Code style**

- Extract generic factories/helpers proactively whenever two or more implementations share the same shape. Don't wait to be asked.
