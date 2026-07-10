# CLAUDE.md - npm Workspace Monorepo

## Workspace Architecture

- Package Manager: npm Workspaces
- Pipeline Types Package Name: `@dyel/pipeline` maps directly to `packages/pipeline/`
- Application Package Name: `@dyel/app` maps directly to `packages/app/`

## Core Commands (Run from Root)

- Build Pipeline Types: `npm run build -w packages/pipeline`
- Build Vite App: `npm run build -w packages/app`
- Start App Dev: `npm run dev -w packages/app`

## Strict Importing Rules

- Any package that needs pipeline types (`SetRecord`, `Point`, `TagQuery`, `Unit`) must import from `@dyel/pipeline`, never a relative path traversal.
- **CRITICAL:** Do NOT use relative path traversals (like `../../core`) to share code.

## Git

- Never commit directly to `main`. Always create a new feature branch before committing.
- Base your feature branches off of `main` unless told otherwise.
- Keep your branch in sync with `git rebase main`
- Submit any changes as a new PR. If you are given a Github issue number, make sure your PR includes the phrase "closes #issue".

## Code Style & Architectural Patterns

Prioritize execution performance and minimize file size using native operations, combined iterations, and flattened application logic.

### 1. Native Platform Operations

Do not write custom utilities for actions supported natively by modern ECMAScript.

- Use `Map.groupBy()` instead of manual grouping loops.
- Use optional chaining (`?.`) and nullish coalescing (`??`) to handle default fallbacks cleanly.

```typescript
const seriesGroups = Map.groupBy(points, (p) => p.series);
const includeChips = chips?.include ?? [];
```

### 2. Consolidated Loop Iterations

Avoid multi-pass processing (e.g., filtering, mapping, then reducing sequentially). Combine evaluation paths into a single loop pass.

- Merge side-effects like voting tallies or conditional score accumulations directly into primary item processing loops.

```typescript
for (const [canonical, latest] of latestBySeries) {
  const assessment = buildAssessment(canonical, latest);
  variants.push(assessment);
  if (assessment.status !== 'optimal') tallyVotes(assessment);
}
```

### 3. Inline Micro-Expressions

Do not break out single-line calculations or simple array lookups into separate top-level utility functions. Keep them inline where consumed.

```typescript
const lift = [...latest.tags].find((t) => t.startsWith('lift:'));
const factor = Object.values(model.baseline).includes(canonical)
  ? 1
  : model.variantFactor[canonical]?.factor;
```

---

## Testing Guidelines

Keep test suites concise, flat, and focused on assertions rather than layout boilerplate.

### 1. Matrix Testing (`it.each`)

Collapse repetitive tests checking variations of inputs, filtering rules, or edge cases into a single `it.each` matrix block.

- Include a short descriptive string as the first column entry for clear test runner diagnostics.

```typescript
it.each([
  ['all (AND)', { all: ['lift:bench'] }, [pt('bench', 100)], [{ t: 1, bench: 100 }]],
  ['none (exclude)', { none: ['chains'] }, [pt('chains', 90)], []],
])('filters correctly with %s', (_, include, points, expected) => {
  expect(buildDataset(points, spec(include))).toEqual(expected);
});
```

### 2. Streamlined Mock Factories

Avoid massive object-literal replication inside individual test blocks. Use factory functions with default baselines and shallow override parameters.

- Type assertions like `as any` are allowed in tests if they eliminate non-critical fallback configuration noise.

```typescript
const pt = (s: string, v: number, t: number, tags: string[] = []) => ({
  t,
  v,
  series: s,
  tags: new Set(tags),
});
const model = (overrides?: any) => ({ baseline: {}, variantFactor: {}, ...overrides });
```

### 3. Direct Inline Assertions

Eliminate temporary variable assignments (like `const rows = run()`). Feed code execution outcomes directly into expectations.

```typescript
expect(buildDataset(points, spec(lifts))).toEqual([{ t: 1, total: 300 }]);
```
