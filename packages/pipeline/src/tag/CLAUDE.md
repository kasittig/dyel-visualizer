# tag/ — SetRecord[] → TaggedSetRecord[]

Runtime tagging is a DICTIONARY LOOKUP, split across two precomputed files —
both versioned in git, edited outside the app. All fuzziness (name
canonicalization, tag assignment, effects) lives in this offline data, never
in code. Never add fuzzy matching, string similarity, or inference here.

## Contract

    function resolveCanonicalNames(records: SetRecord[], aliases: ExerciseAliasMap):
      { resolved: SetRecord[]; unknown: string[] };
    function tagRecords(records: SetRecord[], map: ExerciseTagMap):
      { tagged: TaggedSetRecord[]; unknown: string[] };
    function matches(tags: ReadonlySet<string>, q: TagQuery): boolean;  // all/any/none

`resolveCanonicalNames` runs first (raw name → canonical), then `tagRecords`
(canonical → tags/effects) on its `resolved` output. Unknown raw names or
unknown canonicals → returned in each step's `unknown` for offline review.
Never guess, never partial-match, never drop silently.

## exercise-aliases.json — raw name → canonical

    "bench w/ chains": "bench-chains"    // fine-grained: variants are DISTINCT canonicals

## exercise-map.json — canonical → tags/effects

    "bench-chains": {
      "tags": ["lift:bench", "addl:chains", "variation"],
      "effects": ["lockout", "tricep"]    // optional; consumed by analyze/
    }

Tag namespaces: `lift:` (exactly one per exercise — lift-family grouping),
`bar:`, `stance:`, `addl:`, `equip:`, plus bare tags (`comp-lift`,
`variation`). Do NOT canonicalize variants down to their comp lift — variant
identity must survive to charting; grouping happens via the `lift:` tag.
`comp-lift` lives on the three competition-lift canonicals (`squat`, `bench`,
`deadlift`) themselves, not on any particular raw alias — those lifts are
always competition lifts regardless of which alias was used.

## Boundaries

- Tags are category-level (per exercise), never per-data-point.
- This module owns the TagQuery matcher; dataset/ imports it.
