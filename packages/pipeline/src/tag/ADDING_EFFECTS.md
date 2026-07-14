# Adding a New Exercise Effect

This guide covers adding a new effect category to the dyel-visualizer pipeline. The codebase derives `effects: string[]` on `TaggedSetRecord`s via two fundamentally different mechanisms depending on lift type, and each has its own wiring.

## Two Distinct Effect Systems

### Comp-Lift Effects (Squat/Bench/Deadlift)

Comp-lift effects are derived from **canonical-name lookup tables** in `detect/modifier-effects.json` (a re-keyed copy of legacy `@dyel/core` data). When a comp-lift exercise is tagged, `buildTagsAndEffects` in `canonical.ts` checks which modifiers are present (bar, stance, equipment, additional weights) and looks up each in the effects map:

```typescript
// Example flow from canonical.ts
const effectsMap = modifierEffects as Record<
  string,
  { effects: string[]; min?: number; max?: number }
>;

// For each modifier present, add its effects:
const add = (k: string) => {
  return effectsMap[k]?.effects.forEach((e: string) => {
    return effects.add(e);
  });
};

// Examples:
add(`equip:board:bench`); // → ['TRICEP_DOMINANT', 'SUPRAMAXIMAL']
add(`stance:sumo:deadlift`); // → ['HIP_DOMINANT', 'POSTERIOR_CHAIN']
add(`bar:ssb:squat`); // → ['KNEE_DOMINANT']
```

The effects map keys follow the pattern `${namespace}:${value}:${liftType}` or `${namespace}:${magnitude}:${value}:${liftType}` (for magnitude-qualified modifiers like `equip:board-2:bench`). Multiple effects can be listed per key, and they are unioned via `Set` to avoid duplication. The resulting `effects: string[]` is returned and stored on `TaggedSetRecord.effects`.

**To add a new comp-lift effect:**

1. Determine which modifier context it applies to (e.g., a new bar type, equipment, stance, or additional-weight variant).
2. Add the new effect string as a value in the existing `effectsMap` object in `detect/modifier-effects.json`. For example, if adding a new bar modifier `"my-bar"` for bench:

```json
{
  "bar:my-bar:bench": {
    "effects": ["NEW_EFFECT"],
    "min": 95,
    "max": 105
  }
}
```

3. Add test coverage in `detect/canonical.test.ts` following the existing `buildTagsAndEffects` pattern:

```typescript
it('my new bar type produces expected effects', () => {
  const res = buildTagsAndEffects(parseExercise('Bench (My Bar)'), 'Bench (My Bar)');
  expect(res.tags.has('bar:my-bar')).toBe(true);
  expect(new Set(res.effects)).toEqual(new Set(['NEW_EFFECT']));
});
```

### Accessory Effects

Accessory effects are derived via **keyword classification** using the `classifyAccessoryEffects` function in `detect/detectors.ts`. This is a regex/token-based pattern matcher that runs at tag time, examining the raw exercise name directly (never a canonical slug):

```typescript
// detect/detectors.ts

export type AccessoryEffect = 'BACK' | 'SHOULDERS' | 'TRICEPS' | 'POSTERIOR_CHAIN';

export const ACCESSORY_EFFECT_DETECTORS: Detector<AccessoryEffect> = [
  ['BACK', (l) => /\blats?\b/.test(l) || /\brows?\b/.test(l)],
  ['SHOULDERS', (l, t) => t.has('ohp') || l.includes('overhead')],
  ['TRICEPS', (l, t) => /\btriceps?\b/.test(l) || t.has('tri')],
  ['POSTERIOR_CHAIN', (l, t) => /\bglutes?\b/.test(l) || t.has('ghr')],
];

export function classifyAccessoryEffects(rawName: string): AccessoryEffect[] {
  const lower = rawName.toLowerCase();
  const tokens = new Set(lower.split(/[\s(),]+/).filter(Boolean));
  return ACCESSORY_EFFECT_DETECTORS.filter(([, match]) => match(lower, tokens)).map(
    ([effect]) => effect
  );
}
```

The `Detector<T>` type is `Array<[T, (lower: string, tokens: Set<string>) => boolean]>`. Each tuple contains:

- The effect constant (e.g., `'BACK'`)
- A predicate function with two parameters:
  - `lower`: the lowercased full raw name string (e.g., `"lat pulldown"`)
  - `tokens`: a `Set<string>` of whitespace/punctuation-split tokens (e.g., `Set { 'lat', 'pulldown' }`)

The `classifyAccessoryEffects` function filters each detector's predicate against the name, returning only the effects whose predicates return `true`.

**To add a new accessory effect:**

1. Add the new effect constant to the `AccessoryEffect` union type in `detect/detectors.ts`:

```typescript
export type AccessoryEffect = 'BACK' | 'SHOULDERS' | 'TRICEPS' | 'POSTERIOR_CHAIN' | 'BICEPS';
```

2. Add a new tuple to `ACCESSORY_EFFECT_DETECTORS` with a keyword matcher. Use word-boundary regexes (`\bword\b`) or token-set membership (`t.has('token')`) to avoid substring false positives. **Critical example:** "Lateral Raise" must not match "lat" — use `/\blats?\b/` not `/lat/`:

```typescript
export const ACCESSORY_EFFECT_DETECTORS: Detector<AccessoryEffect> = [
  ['BACK', (l) => /\blats?\b/.test(l) || /\brows?\b/.test(l)],
  ['SHOULDERS', (l, t) => t.has('ohp') || l.includes('overhead')],
  ['TRICEPS', (l, t) => /\btriceps?\b/.test(l) || t.has('tri')],
  ['POSTERIOR_CHAIN', (l, t) => /\bglutes?\b/.test(l) || t.has('ghr')],
  ['BICEPS', (l, t) => /\bbiceps?\b/.test(l) || t.has('bi')], // new entry
];
```

Use either:

- **Word-boundary regex** for single-word keywords: `/\bbiceps?\b/` (matches "bicep" or "biceps" as whole words)
- **Token-set membership** for abbreviated tokens: `t.has('bi')` (matches the exact token "bi" split by whitespace/punctuation)
- **String inclusion** for multi-word phrases: `l.includes('overhead press')` (for phrases that stay together across tokenization)

Prefer regexes and token matching over raw string inclusion (`.includes()`) unless the keyword is a known multi-word phrase.

3. No additional wiring is required. When `buildAccessoryTaggedRecords` or `tagRecords` processes an accessory record, it calls `buildTagsAndEffects`, which automatically applies every detector in `ACCESSORY_EFFECT_DETECTORS` to the raw exercise name.

4. Add test coverage in `tag.test.ts` by extending the `classifyAccessoryEffects` test matrix:

```typescript
describe('classifyAccessoryEffects', () => {
  it.each([
    ['Lat Pulldown', ['BACK']],
    ['Barbell Row', ['BACK']],
    ['Seated Cable Rows', ['BACK']],
    ['Lateral Raise', []],
    ['Dumbbell OHP', ['SHOULDERS']],
    ['Overhead Press', ['SHOULDERS']],
    ['Tricep Pushdown', ['TRICEPS']],
    ['Skull Crusher (Tri)', ['TRICEPS']],
    ['Glute Bridge', ['POSTERIOR_CHAIN']],
    ['GHR', ['POSTERIOR_CHAIN']],
    ['Bicep Curl', ['BICEPS']], // new test row
    ['Barbell Bicep Curl', ['BICEPS']], // new test row
    ['Face Pulls', []],
  ])('classifies "%s" as %s', (name, expected) => {
    expect(classifyAccessoryEffects(name)).toEqual(expected);
  });
});
```

Test rows must have format `[exerciseName, [expectedEffectArray]]` — the test name (first column) is auto-generated for diagnostics.

## Downstream Consumption

The `effects: string[]` on each `TaggedSetRecord` flows through the system:

- **Pipeline output**: `PipelineModel.tagged` exposes `TaggedSetRecord[]` with effects intact
- **API layer**: `@dyel/api` receives tagged records and builds `AccessoryTableRow` objects in `packages/api/src/accessory/accessorySubtypeTable.ts`, each with an `effects: string[]` field
- **UI rendering**: `packages/app` consumes these via the `useAccessoryTable` hook, which applies a `formatEffect` display formatter from `@dyel/api`
- **Chart display**: Effects appear as a sortable column in `AccessoryTable.tsx`

Both comp-lift and accessory effects follow the same downstream path: `TaggedSetRecord.effects` → API → UI display.

## Constraints & Gotchas

### Module Boundaries

- `detect/` is **internal to `tag/`**. Never export `classifyAccessoryEffects`, `AccessoryEffect`, `ACCESSORY_EFFECT_DETECTORS`, `isCoreExercise`, `CORE_PATTERN`, or any detector types from `tag.ts` or the pipeline root `index.ts`.
- These are keyword-detector internals; external consumers (e.g., `packages/app`) should never depend on them directly. If an external caller needs to know about effects, they consume the **already-tagged** `TaggedSetRecord.effects` from the pipeline or API output, not the classifier functions.

### Code Style

- Always use `{ }` braces after every `if`/`else` block (ESLint `curly` rule is enforced).
- Prefer native operations: use `Map.groupBy` for grouping, optional chaining (`?.`), nullish coalescing (`??`).
- In detector predicates, combine token/regex checks into single-pass evaluations — do not split logic across multiple helper functions unless genuinely complex.
- In tests, use `it.each` matrices to collapse repetitive cases; include a descriptive first column for test runner output.

### Keyword Matching Discipline

- **Word-boundary regexes** (`/\bword\b/`) prevent false positives from substrings. Always use them for single-word keywords.
- **Token-set membership** (`t.has('token')`) is precise for abbreviations; tokens are split by `[\s(),]+` (whitespace, parens, commas).
- **String inclusion** (`.includes()`) is appropriate only for known multi-word phrases like "overhead press" where the phrase travels together through tokenization. Do not use it for single-token searches.
- Test edge cases: "Lateral Raise" should not match `'BACK'` (word boundary prevents "lat" collision), "GHR" and "Glute-Ham Raise" should both match `'POSTERIOR_CHAIN'`, etc.

### Testing Accessibility

Ensure tests are runnable in isolation and don't depend on external state. All test factories and helper functions are already defined in the test files; use those patterns if adding new detector tests.
