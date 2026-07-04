# tag/ — SetRecord[] → TaggedSetRecord[]

Runtime tagging is a DICTIONARY LOOKUP. All fuzziness (name canonicalization,
tag assignment, effects) is precomputed offline into `exercise-map.json` —
versioned in git, edited outside the app. Never add fuzzy matching, string
similarity, or inference here.

## Contract

    function tagRecords(records: SetRecord[], map: ExerciseTagMap):
      { tagged: TaggedSetRecord[]; unknown: string[] };
    function matches(tags: ReadonlySet<string>, q: TagQuery): boolean;  // all/any/none

Unknown raw names → returned in `unknown` for offline review. Never guess,
never partial-match, never drop silently.

## exercise-map.json

    "bench w/ chains": {
      "canonical": "bench-chains",        // fine-grained: variants are DISTINCT canonicals
      "tags": ["lift:bench", "addl:chains", "variation"],
      "effects": ["lockout", "tricep"]    // optional; consumed by analyze/
    }

Tag namespaces: `lift:` (exactly one per exercise — lift-family grouping),
`bar:`, `stance:`, `addl:`, `equip:`, plus bare tags (`comp-lift`,
`variation`). Do NOT canonicalize variants down to their comp lift — variant
identity must survive to charting; grouping happens via the `lift:` tag.

## Boundaries

- Tags are category-level (per exercise), never per-data-point.
- This module owns the TagQuery matcher; dataset/ imports it.
