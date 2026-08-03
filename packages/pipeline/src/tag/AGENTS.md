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
    function classifyAccessorySubtypes(tagged: TaggedSetRecord[]): TaggedSetRecord[];
    function matches(tags: ReadonlySet<string>, q: TagQuery): boolean;  // all/any/none
    function classifyExerciseName(name: string): { type: LiftType; isUnknown: boolean };

`classifyExerciseName` is a small additive export (wraps `parseExercise`) for callers that
just need a lift-type/unknown classification without going through the full
`resolveCanonicalNames`/`tagRecords` pipeline — e.g. `packages/app`'s sheet/freeform
validators and `packages/api`'s `parseTextData`.

`resolveCanonicalNames` runs first (raw name → canonical via `detect/parseExercise.ts` +
`detect/canonical.ts`'s `buildCanonical`), then `tagRecords` (canonical → tags/effects via
`buildTagsAndEffects`) on its `resolved` output. Both steps parse via the same
`parseExercise`; canonical strings parse back through consistently for non-accessory
lifts since the canonical format is itself built from parseable keywords.

## Canonical format

For non-accessory lifts: `${type}[-${bar}][-${stance}][-${equipment}][-${addlWts...}]`,
omitting default values (`bar: standard`, and each lift type's default stance — `deadlift: conventional`, `bench: wide`, `squat: lowbar`, per `DEFAULT_STANCE` in `detect/conjugate-types.ts`) and any absent component.
For accessory lifts (parser always nulls bar/stance/equipment there): a kebab-slugified
raw name, preserving per-exercise distinctness without a dictionary.

**Magnitude conventions:** When equipment or addlWts are present, they may include a magnitude
suffix. For chains/bands (`addlWts`), magnitude is parsed as a digit or the word `"double"`
from the raw exercise label; it defaults to `'1'` when not specified. For board equipment,
magnitude is parsed as a digit from the raw label and passed through as a literal value; it
defaults to `'1'` when not specified. For blocks and deficit equipment, if a magnitude digit
is followed by a `"` inch mark, it is converted to a physical unit count via `Math.round(inches / 2)`
(blocks are ~2" apart, deficit pads are ~2" each) before being used as the magnitude; plain
`N blocks` or `N deficit` without an inch mark passes through as a literal count unchanged.
Blocks and deficit both default to `'1'` when not specified. The magnitude suffix is appended
to the canonical as `-${magnitude}` only when the magnitude is **not** the default `'1'` — the
default is always omitted. Examples:

- `Bench (1 board)` → `bench-board` (default magnitude omitted)
- `Bench (2 board)` → `bench-board-2` (non-default magnitude appended)
- `Deadlift (1 block)` → `deadlift-blocks` (default magnitude omitted)
- `Deadlift (2" blocks)` → `deadlift-blocks` (2" = 1 block = default magnitude omitted)
- `Deadlift (4" blocks)` → `deadlift-blocks-2` (4" = 2 blocks = non-default magnitude appended)
- `Deadlift (2" deficit)` → `deadlift-deficit` (2" = 1 deficit unit = default magnitude omitted)
- `Deadlift (4" deficit)` → `deadlift-deficit-2` (4" = 2 deficit units = non-default magnitude appended)

## Tag/effects derivation

`lift:${type}` always. If the exercise has zero modifiers (default bar/stance,
no equipment, no addlWts) — i.e. a bare comp lift — it gets `comp-lift` plus explicit
facet tags `bar:standard` and the lift type's default stance tag (e.g., `stance:conventional` for deadlift, `stance:wide` for bench, `stance:lowbar` for squat, per `DEFAULT_STANCE` in `detect/conjugate-types.ts`). This only ever applies to the three
bare canonicals themselves, never a variant. Otherwise it gets `bar:`/`stance:`/`equip:`/
`addl:` tags for each present non-default component (no `comp-lift`, no other bare tag).
Effects are looked up per present component as `${namespace}:${value}:${type}` in
`detect/modifier-effects.json` and unioned (deduped via `Set`) onto
`TaggedSetRecord.effects`. For deadlifts with an explicit stance keyword (e.g., "sumo",
"conventional") in the exercise name, equipment-effects lookup first attempts a stance-qualified
key (`equip:${equipment}[-${magnitude}]:${resolvedStance}:deadlift`) before falling back to the
stance-agnostic magnitude/base key. Range composition tracks which facet-qualified modifier
values (e.g. `stance:sumo`) have already contributed to the running range; a facet's own
dedicated range key is skipped if its value was already covered by an earlier compound key —
e.g. the stance-qualified equipment key above already bakes in the stance adjustment, so the
generic `stance:${resolvedStance}:deadlift` range is not separately composed on top of it. This
also applies to a bare deadlift with no explicit stance keyword, since it resolves the same
concrete `conventional` default stance and goes through the same stance-qualified equipment
lookup. Effects unions (`add(...)`) are unaffected by this and always apply regardless. This is
a general rule (tracked via a `consumedFacetValues` set in `canonical.ts`), not special-cased to
deadlifts/blocks — any future compound key gets the same protection automatically. Note that
today's parser (`detect/parseExercise.ts`) only ever yields a single bar/stance/equipment value
per exercise, so same-facet double-application (e.g. two stance values on one lift) isn't
otherwise reachable — this rule exists specifically for cross-facet compound keys.

The `'competition'` tag (no namespace prefix, unlike `bar:`/`stance:`) marks records logged in a
competition setting. For squat and bench, this tag is applied automatically whenever their
resolved stance is `lowbar` or `wide` respectively — which is always the case, since those are
also their lift-type defaults (applied inside `buildTagsAndEffects` in `detect/canonical.ts`).
Deadlift's `'competition'` tag is not determined at single-record tag time; it requires comparing
e1RM across the athlete's sumo vs. conventional deadlifts to identify their stronger stance
(by best e1RM, ties/no-data defaulting to conventional), which is unavailable in this module.
Instead, it is applied as a post-tagging patch in `pipeline.ts`'s `runPipelineModel` via a helper
called `tagCompetitionDeadliftStance`, before any other tag-dependent computation runs — see
`packages/pipeline/AGENTS.md` for details.

Bare deadlifts now always resolve a concrete default stance (conventional, via `DEFAULT_STANCE`),
so they are never unassessed for missing-stance reasons anymore — a bare `"Deadlift (1 block)"`
resolves its baseline range via the conventional stance-qualified equipment key, same as an
explicitly-labeled `"Conventional Deadlift (1 block)"`. Block and deficit equipment ratios
diverge by stance in `modifier-effects.json` (see the stance-qualified keys
`equip:blocks*:sumo/conventional:deadlift` and `equip:deficit:sumo/conventional:deadlift`).
If a given stance/equipment/magnitude combination has no matching data entry in the lookup
(e.g., there is currently no magnitude-2 stance-qualified deficit entry), `range` resolves to
`null` (which `analyze/diagnose.ts` routes to `unassessed`) — a partial range built from only
one of the two expected multiplicative components would be misleading, so the whole range is
treated as unassessed instead.

For accessory records, effects are additionally populated via `classifyAccessoryEffects`
(in `detect/detectors.ts`), a keyword classifier mapping the raw exercise name to zero or
more of `BACK` / `SHOULDERS` / `TRICEPS` / `POSTERIOR_CHAIN`. Keywords are matched via
word-boundary regexes to avoid substring false positives (e.g., "lateral raise" must not
match "lat"): `\blats?\b` or `\brows?\b` → BACK; `ohp` token or "overhead" → SHOULDERS;
`\btriceps?\b` or `tri` token → TRICEPS; `\bglutes?\b` or `ghr` token → POSTERIOR_CHAIN.
This uses the same discipline as `isCoreExercise` (word-boundary/token-match, not raw
substring matching) to prevent incidental collisions.

For a step-by-step guide to adding a new effect category, see `ADDING_EFFECTS.md` in this directory.

## Primary-lift promotion and unknown validation

`tagRecordsByPrimaryEvidence` treats the parser's squat/bench/deadlift result as a candidate
family. A canonical variation is promoted into that family only when its history contains an
exact 1-, 2-, or 3-rep set whose RPE is at least 9, or a single set with no RPE. Multi-set
no-RPE speed work never qualifies. Promotion applies to every record
with that canonical, including aliases and records earlier than the qualifying set. Recognized
variations without evidence keep their candidate canonical but receive `lift:accessory`,
accessory effects, and no baseline range.

Unknown validation is independent of promotion. A name is reported unknown only when
`parseExercise(raw)` falls back to `accessory`; recognized-but-unpromoted candidates are not
validation errors. Because the parser has no positive accessory dictionary, genuine accessories
and unrecognized/mistyped primary-lift names remain indistinguishable in the unknown report.

## Accessory subtype classification

`classifyAccessorySubtypes` runs after history-aware tagging, not inside `buildTagsAndEffects`, because
determining upper vs. lower subtype requires knowing what OTHER exercises were logged on the
same calendar day (`r.date`) — context unavailable when tagging a single record in isolation.
It groups all tagged records by `date` once (via `Map.groupBy`), then for each record already
tagged `lift:accessory`:

- If the exercise name matches a core-exercise keyword heuristic (via `isCoreExercise` in
  `detect/detectors.ts` — a word-boundary regex matching common ab/core keywords: ab/abs, core,
  plank, crunch/crunches, hollow, sit-up/situp, russian twist, leg raise, pallof, wood chop,
  dead bug, v-up), it gets tagged `accessory:core`, regardless of day context.
- Otherwise, it examines whether that day's records include `lift:bench` and/or
  `lift:squat`/`lift:deadlift`: bench-only day → `accessory:upper`; squat/deadlift-only day →
  `accessory:lower`.
- If the day has BOTH bench and squat/deadlift, or NEITHER, the record remains tagged
  `lift:accessory` with no subtype — an accepted imperfect limitation.
  This treats ambiguity analogously to the existing heuristic: accept no-context cases rather
  than guess.

The core-keyword heuristic itself is keyword-based (not dictionary-backed), same caveat as the
rest of this file's parsing: a false negative is possible for an unusual ab-exercise name, a
false positive theoretically possible for a name containing a matched word coincidentally
(mitigated by word-boundary `\b` matching, not raw substring matching).

## Boundaries

- Tags are category-level (per exercise), never per-data-point.
- This module owns the TagQuery matcher; dataset/ imports it.
- `detect/` is internal to this module — nothing outside `tag/` should import from it
  directly; go through `tag.ts`'s exports.
