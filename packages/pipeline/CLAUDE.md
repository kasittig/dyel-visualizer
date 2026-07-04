# packages/pipeline

Flat, logic-free root of the future dyel pipeline import graph.

## Files

- **`src/types.ts`** — `SetRecord` (post-parse, unit-normalized-to-kg log entry with an audit-trail `meta` bag), `Point` (a single plotted value with a canonical `series` id and a `ReadonlySet<string>` of tags), `TagQuery` (all/any/none filter shape), and `Unit` (`'lbs' | 'kg'`, used only at parse time — it does not appear on `SetRecord`).

## Key invariants

- `types.ts` contains ONLY type/interface declarations — no runtime logic, no default exports.
- `SetRecord.weight` is always kg internally. Raw unit/weight before conversion live in `SetRecord.meta`, not as typed fields — unit handling is a parser concern, not a pipeline-types concern.
- `Point.tags` is a `ReadonlySet<string>`, not an array — callers must not assume order or mutate it.
- Future modules (parse, tag, derive, analyze, dataset, pipeline) will each get their own file/directory here and must import from `./types`, never redefine these shapes.
- `TaggedSetRecord` intentionally does not exist yet — it belongs to the future tag stage.
