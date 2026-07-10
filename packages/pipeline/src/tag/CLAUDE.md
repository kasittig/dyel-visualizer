# tag/ — SetRecord[] → TaggedSetRecord[]

Runtime tagging is a KEYWORD-DETECTOR PARSE, not a dictionary lookup. `detect/` holds a
ported copy of the now-deleted `@dyel/core` package's exercise-name parser
(`detect/detectors.ts` + `detect/parseExercise.ts`) plus a re-keyed copy of its
`modifierEffects.json` (`detect/modifier-effects.json`). This was always a deliberate
one-time copy, never a dependency — pipeline never imported from `@dyel/core`, and
`@dyel/core` has since been removed from the workspace entirely (see
`HANDOFF.md`).

## Contract

    function resolveCanonicalNames(records: SetRecord[]):
      { resolved: SetRecord[]; unknown: string[] };
    function tagRecords(records: SetRecord[]):
      { tagged: TaggedSetRecord[]; unknown: string[] };
    function matches(tags: ReadonlySet<string>, q: TagQuery): boolean;  // all/any/none
    function classifyExerciseName(name: string): { type: LiftType; isUnknown: boolean };
    function facetsFromTags(tags: ReadonlySet<string>): { bar; stance; equipment; equipmentMagnitude; addlWts };
    function facetFamilyKey(canonical: string): string;

`classifyExerciseName` is a small additive export (wraps `parseExercise`) for callers that
just need a lift-type/unknown classification without going through the full
`resolveCanonicalNames`/`tagRecords` pipeline — e.g. `packages/app`'s sheet/freeform
validators and `packages/api`'s `parseTextData`. `facetsFromTags`/`facetFamilyKey` parse
tag strings back into structured facets (used by `packages/api/src/sheet/defaultExercise.ts`)
— see their doc comments in `tag.ts` for details.

`resolveCanonicalNames` runs first (raw name → canonical via `detect/parseExercise.ts` +
`detect/canonical.ts`'s `buildCanonical`), then `tagRecords` (canonical → tags/effects via
`buildTagsAndEffects`) on its `resolved` output. Both steps parse via the same
`parseExercise`; canonical strings parse back through consistently for non-accessory
lifts since the canonical format is itself built from parseable keywords.

## Canonical format

For non-accessory lifts: `${type}[-${bar}][-${stance}][-${equipment}][-${addlWts...}]`,
omitting default values (`bar: standard`, `stance: competition`) and any absent component.
For accessory lifts (parser always nulls bar/stance/equipment there): a kebab-slugified
raw name, preserving per-exercise distinctness without a dictionary.

**Magnitude conventions:** When equipment or addlWts are present, they may include a magnitude
suffix. For chains/bands (`addlWts`), magnitude is parsed as a digit or the word `"double"`
from the raw exercise label; it defaults to `'1'` when not specified. For board/block/deficit
equipment, magnitude is parsed as a digit (optionally followed by a `"` inch mark) from the raw
label; it also defaults to `'1'`. The magnitude suffix is appended to the canonical as `-${magnitude}`
only when the magnitude is **not** the default `'1'` — the default is always omitted. Examples:

- `Bench (1 board)` → `bench-board` (default magnitude omitted)
- `Bench (2 board)` → `bench-board-2` (non-default magnitude appended)
- `Deadlift (1 block)` → `deadlift-blocks` (default magnitude omitted)
- `Deadlift (2" blocks)` → `deadlift-blocks-2` (non-default magnitude appended)

## Tag/effects derivation

`lift:${type}` always. If the exercise has zero modifiers (default bar/stance,
no equipment, no addlWts) it also gets `comp-lift` — this only ever applies to the three
bare canonicals themselves, never a variant. Otherwise it gets `bar:`/`stance:`/`equip:`/
`addl:` tags for each present non-default component (no `comp-lift`, no other bare tag).
Effects are looked up per present component as `${namespace}:${value}:${type}` in
`detect/modifier-effects.json` and unioned (deduped via `Set`) onto
`TaggedSetRecord.effects`.

## Unknown heuristic

A record is unknown when `parseExercise(raw)` yields `type === 'accessory'` with
null bar/stance/equipment and empty `addlWts` — i.e. every accessory lift, since the
parser always nulls those fields for accessories. This is an accepted, imperfect
limitation: a genuine accessory lift and an unrecognized/mistyped comp-lift variant are
indistinguishable by this heuristic; both land in `unknown` for offline review.

## Boundaries

- Tags are category-level (per exercise), never per-data-point.
- This module owns the TagQuery matcher; dataset/ imports it.
- `detect/` is internal to this module — nothing outside `tag/` should import from it
  directly; go through `tag.ts`'s exports.
