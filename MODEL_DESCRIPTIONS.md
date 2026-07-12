# Model Descriptions

These describe the current `@dyel/pipeline` implementations. The now-deleted `@dyel/core`
package originally had similarly-named functions (`predictE1RM`, `normalizeToBaseE1RM`,
`generateDiagnostics`) that this doc used to describe directly; `@dyel/core` has since been
fully removed from the workspace (see `HANDOFF.md`) and its logic ported/rearchitected into
`@dyel/pipeline`, so each section below now names the pipeline-native equivalent.

## e1RM Prediction (`projectE1RMToDate`)

### What it does

Given a set of known e1RM values (one per session date) and a target date, returns a predicted e1RM using piecewise linear interpolation and extrapolation.

- **Between sessions:** linearly interpolates between the two surrounding data points.
- **After the last session:** linearly extrapolates forward at the slope of the last two sessions.
- **Before the first session:** linearly extrapolates backward at the slope of the first two sessions.
- **Single session:** returns that e1RM for any date (no rate can be estimated).
- **No sessions:** returns `null`.
- **Floor:** all predictions are clamped to a minimum of 0.

Each session's e1RM is the best (highest) e1RM across all sets on that date, computed with the Epley formula (`weight × (1 + reps / 30)`, RPE-adjusted when present — see `derive/e1rm.ts`'s `calcE1RM`). `projectE1RMToDate(points, targetDate)` (`packages/pipeline/src/derive/normalize.ts`) takes already-derived `{t, v}` points (e.g. from the pipeline's `e1rm` deriver) rather than raw sessions directly, but is otherwise an unchanged, pure port of legacy's algorithm — same edge-extrapolation behavior, same interpolation.

Each exercise variation (canonical) has its own independent prediction curve, since points are grouped by canonical before this function ever sees them.

### Assumptions

1. **Linear progression within a cycle.** Strength gains (or losses) are assumed to be constant between any two consecutive sessions.
2. **The boundary rate continues unchanged.** Forward extrapolation uses the slope of the last two sessions; backward extrapolation uses the slope of the first two. There is no decay or correction applied to either.
3. **Best set per day.** When someone performs multiple sets on the same day, only the highest e1RM is kept. Lower sets do not affect the curve.
4. **Conjugate variations are independent.** In Conjugate Mode, "bench" and "bench w/ chains" are treated as completely separate exercises with no shared signal.

### Cases not handled

- **Deload weeks.** A planned drop in training load (and therefore e1RM) followed by a peak will look like a trough to the model. Extrapolating through or beyond a deload will be inaccurate.
- **Training breaks.** An injury or extended layoff creates a large time gap. The model computes the rate across that gap, which will underestimate the actual progress rate on either side.
- **Peaking cycles.** A competition peak often produces an e1RM spike that is not a sustainable trend. Using a peak date as the "last session" will cause the forward extrapolation to overestimate future e1RMs.
- **Non-linear progress curves.** Beginners tend to progress faster early on; advanced lifters plateau. The model applies a constant rate regardless of training age or phase.
- **Regression below zero.** If extrapolation would produce a negative e1RM, the result is clamped to 0. A prediction of 0 is not meaningful — it just means the linear model has run out of range.

## Cross-exercise e1RM normalization (`fitNormalizationModel` / `normalizeE1rm` / `projectToVariant`)

### What it does

Given an e1RM recorded under one exercise (the _source_ canonical), returns the equivalent e1RM expressed in terms of that lift family's baseline exercise (e.g. express an SSB squat session as a competition squat e1RM). Unlike legacy's `normalizeToBaseE1RM`, this is **baseline-only, not arbitrary source→target**: everything normalizes to (or projects from) the model's fixed per-lift-family baseline canonical — there is no "normalize any exercise to any other exercise" path. All of this lives in `packages/pipeline/src/derive/normalize.ts`.

`fitNormalizationModel(history, { minSamples }, athlete)` produces a `NormalizationModel` with three fitted fields:

- **`baseline`** — per lift family (`lift:squat`/`lift:bench`/`lift:deadlift`), the canonical chosen as that family's anchor. Selection prefers (first match wins): an exercise explicitly logged with "competition" in its name, then the athlete's preferred deadlift stance, then a paused/"commands" bench, then any plain `comp-lift`-tagged entry, then any entry at all — ties broken by most logged samples, then alphabetically.
- **`variantFactor`** — per non-baseline canonical, the ratio of that exercise's e1RM to the baseline exercise's e1RM (e.g. SSB squat ÷ competition squat ≈ 0.90), fitted by interpolating the baseline's e1RM grid at each variant session's date and averaging the ratio. `null`/absent when fewer than `minSamples` sessions are available — never silently defaults to 1.0.
- **`addlWtOffset`** — per addlWt (chains/bands) canonical, the average kg difference between its logged weight and the "effective" straight-bar weight at the same rep count, fitted against the matching addlWt-free canonical in the same family (same bar/stance/equipment, no chains/bands). Chain/band offsets are typically negative (they add weight that contributes less than a straight plate).

### Applying the model

**Fit-time offset correction (Design B, mirroring legacy's `applyAddlWtOffset`-before-`fitVariantFactor` sequencing):** for addlWt canonicals, `fitNormalizationModel` fits the offset first, then offset-adjusts that canonical's records (`weight += offsetKg`) _before_ fitting `variantFactor` against them — so the stored factor reflects only the biomechanical variation, with the chain/band contribution already backed out.

**Pre-derivation weight-space correction (Design C, supersedes an earlier e1RM-space approximation):** `offsetAdjustRecords(records, model)` applies the same `weight += offsetKg` correction to raw `TaggedSetRecord[]` before any e1RM derivation happens. `pipeline.ts` uses this for composite chart specs (e.g. `TotalChart`, `ConjugateCharts`' normalized line) so their e1RM values are derived from already-corrected weights, not corrected after the fact. Canonicals with no fitted offset (including the baseline itself) pass through unchanged.

**Apply-time, once weights are already correct:**

```
normalizeE1rm(canonical, e1rmKg, model)          // variant → baseline: e1rmKg / factor
projectToVariant(baseE1rmKg, canonical, model)   // baseline → variant: baseE1rmKg * factor
```

Both are now pure factor operations (no additional offset math — offset correction already happened upstream via `offsetAdjustRecords`). Both return `null`, never a silent fallback to `1.0`, when the canonical has no fitted `variantFactor` (or isn't itself the baseline). `projectToVariant` currently has no production callers — the app only ever projects the other direction (variant → baseline).

### Assumptions

1. **Factors are stationary.** The ratio between two exercises is assumed to be constant over time. In practice it can shift as a lifter's technique or body composition changes.
2. **addlWt contributes linearly.** The offset model assumes the effective weight penalty for chains is a fixed number of kg per session, regardless of the total load or where in the range of motion the chain weight is heaviest.
3. **addlWt and biomechanical effects are independent.** The fit-time sequencing (offset-adjust, then fit `variantFactor`) is valid only if the two adjustments don't interact — i.e. the biomechanical factor for "SSB + chains" equals the factor for "SSB" alone.

### Cases not handled

- **Arbitrary source→target normalization.** Legacy's `normalizeToBaseE1RM` could convert between any two exercises directly (e.g. SSB squat → floor press); the pipeline only supports variant↔baseline. Cross-variant comparison (neither side the baseline) isn't a supported operation — this was a deliberate scope narrowing when `ConjugateCharts`/`VariationRadarChart` were migrated (see `HANDOFF.md`), not an oversight.
- **No fitted offset for an addlWt canonical.** If no matching addlWt-free canonical exists in the same family to fit against, `addlWtOffset` for that canonical is simply left unfitted; `offsetAdjustRecords` passes its records through unchanged (no fallback approximation).
- **`projectToVariant`'s offset limitation.** Since offset correction now happens in weight-space before this function ever runs, `projectToVariant` has no principled way to reintroduce a target's offset post-hoc if called on values that were never offset-adjusted upstream — a known, accepted approximation limitation, not a bug (it has no production callers currently).

## Diagnostic baseline combination (`diagnose`)

### What it does

Each entry in `packages/pipeline/src/tag/detect/modifier-effects.json` carries an optional `min`/`max` percentage range expressing how strong a lifter is expected to be at that variation relative to their competition lift. For example, `equip:pause:squat` is 85–95%, meaning a pause squat is expected at 85–95% of the competition squat e1RM. This combination itself happens at tagging time in `buildTagsAndEffects` (`packages/pipeline/src/tag/detect/canonical.ts`), producing each `TaggedSetRecord`'s `baselineRange`; `diagnose()` (`packages/pipeline/src/analyze/diagnose.ts`) is the function that then compares a variant's actual fitted strength (`variantFactor` as a %, see above) against that range to classify it `optimal`/`weakness`/`overperforming` (plus a `stale` status when the variant's most recent data point is older than the staleness threshold — see `analyze/CLAUDE.md`).

When an exercise has **multiple pct-bearing modifiers active simultaneously** (e.g. an SSB + pause squat has both `bar:ssb:squat` and `equip:pause:squat`), the tagging step combines them into a single expected range using **multiplicative scaling**:

```
combined_min = round(m1_min × m2_min / 100)   (applied iteratively)
combined_max = round(m1_max × m2_max / 100)
```

Starting from 100%, each modifier's range is applied in turn. `addl:` (chains, bands, reverse bands) tags carry no pct and are never included.

### Examples

| Exercise        | Modifiers                                           | Baseline |
| --------------- | --------------------------------------------------- | -------- |
| SSB pause squat | bar:ssb:squat (90–95%) × equip:pause:squat (85–95%) | 77–90%   |
| SSB box squat   | equip:box:squat (90–100%) × bar:ssb:squat (90–95%)  | 81–95%   |
| Board press     | equip:board:bench (105–115%)                        | 105–115% |

### Assumptions

1. **Modifier pct values are independent.** The expected difficulty of stacking an SSB with a pause is the product of the two individual difficulties, with no interaction term. In practice this may overestimate the combined penalty if the two modifiers share a root cause (e.g. both challenge the upper back), but there is no data available to fit interaction terms.
2. **Combined min ≤ combined max is preserved.** Because each modifier's `min ≤ max` and both are positive, multiplying min × min and max × max preserves the ordering after rounding.
3. **Order does not affect the result.** Multiplication is commutative; the final range is the same regardless of which modifier is applied first.
