# Model Descriptions

## e1RM Prediction (`predictE1RM`)

### What it does

Given a set of known e1RM values (one per session date) and a target date, returns a predicted e1RM using piecewise linear interpolation and extrapolation.

- **Between sessions:** linearly interpolates between the two surrounding data points.
- **After the last session:** linearly extrapolates forward at the slope of the last two sessions.
- **Before the first session:** linearly extrapolates backward at the slope of the first two sessions.
- **Single session:** returns that e1RM for any date (no rate can be estimated).
- **No sessions:** returns `null`.
- **Floor:** all predictions are clamped to a minimum of 0.

Each session's e1RM is the best (highest) e1RM across all sets on that date, computed with the Epley formula (`weight × (1 + reps / 30)`).

In Conjugate Mode, each exercise variation has its own independent prediction curve.

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

## Cross-exercise e1RM normalization (`normalizeToBaseE1RM`)

### What it does

Given a `(weight, reps)` recorded under one exercise (the _source_), returns the equivalent e1RM expressed in terms of a different exercise (the _target_). This lets you compare lifts across variations — e.g. express an SSB squat session as a competition squat e1RM, or convert a swiss bar floor press with chains into a bench press e1RM.

The function uses two pre-fitted statistics from `RepCalcStats`, both computed by `useLastSessionStats`:

- **`addlWtOffset`** — per exercise, the average difference between the bar weight and the "effective" straight-bar weight at the same rep count. Negative when chains or bands add weight that contributes less than a straight plate (e.g. because chain weight deloads at the bottom). Keyed by the exercise's display name.
- **`variantFactor`** — per exercise, the ratio of that exercise's e1RM to the baseline exercise's e1RM (e.g. SSB squat ÷ competition squat ≈ 0.90). Fitted against _addlWt-adjusted_ sessions (see below). Keyed by the exercise's display name.

### Normalization paths

**1. Exact match** (`source.displayName === target.displayName`)

Returns `calcE1RM(weight, reps)` with no adjustment.

**2. Same family, different addlWts** (`familyKey(source) === familyKey(target)`)

`familyKey` is `type | bar | stance | equipment`. Two exercises in the same family differ only in chains or bands.

- _Source has addlWts, target does not_ (strip): `calcE1RM(weight + offset, reps)` where `offset = addlWtOffset[source]`. The offset is negative, so this reduces the effective weight.
- _Target has addlWts, source does not_ (add): `calcE1RM(max(0, weight − offset), reps)`. Subtracting a negative offset increases the bar weight to what you would need to load with chains to match the straight-bar lift.

Returns `null` if the required offset entry is missing or has zero samples.

**3. Cross-family** (different bar, stance, or equipment)

Uses `variantFactor` to convert through a shared baseline:

```
result = (sourceE1RM / sourceFactor) × targetFactor
```

where `sourceFactor` and `targetFactor` are each exercise's ratio to the baseline (the optional `baseline` parameter gets factor = 1.0; everything else is looked up in `variantFactor`).

**Order of operations matters for addlWt sources.** `variantFactor` entries for chain/band exercises are fitted against _chain-stripped_ session weights (in `useLastSessionStats` pass 4, each session weight is adjusted by `addlWtOffset` before `fitVariantFactor` is called). This means the stored factor reflects only the _biomechanical_ variation — the chain contribution has already been removed from the training data. To be consistent, `normalizeToBaseE1RM` must strip the addlWt from the source weight _before_ dividing by the factor:

```
sourceE1RM = calcE1RM(weight + addlWtOffset[source], reps)   // strip chains first
result     = (sourceE1RM / sourceFactor) × targetFactor       // then apply factors
```

If instead the raw (chain-weighted) e1RM were divided by the factor, the chain load would be scaled by `1 / sourceFactor` rather than removed, producing an incorrect result. If no offset entry exists for an addlWt source, the raw e1RM is used as a best-effort approximation.

Returns `null` if either factor is missing or has zero samples.

### Assumptions

1. **Factors are stationary.** The ratio between two exercises is assumed to be constant over time. In practice it can shift as a lifter's technique or body composition changes.
2. **addlWt contributes linearly.** The offset model assumes the effective weight penalty for chains is a fixed number of pounds per session, regardless of the total load or where in the range of motion the chain weight is heaviest.
3. **addlWt and biomechanical effects are independent.** For cross-family normalization of addlWt sources, the code strips chains via the offset and then applies the bar/stance/equipment factor. This is valid only if the two adjustments do not interact — i.e. the biomechanical factor for "SSB + chains" equals the factor for "SSB" alone.

### Cases not handled

- **Source has addlWts and target is in a different family, but no `addlWtOffset` entry exists.** The function falls back to the raw (chain-weighted) e1RM before dividing by `variantFactor`, which will overestimate the baseline e1RM.
- **Neither source nor target is the baseline, and one of them has no `variantFactor` entry.** Returns `null`; there is not enough data to cross-normalize.
- **Proxy offset lookup for same-family → addlWt target.** `findBestE1RM` can search for a proxy offset from a related exercise in the same family, but `normalizeToBaseE1RM` only looks up the target's own `addlWtOffset` entry. If that entry is missing, it returns `null` rather than falling back to a proxy.

## Diagnostic baseline combination (`generateDiagnostics`)

### What it does

Each entry in `MODIFIER_EFFECTS` carries an optional `min`/`max` percentage range expressing how strong a lifter is expected to be at that variation relative to their competition lift. For example, `equipment:pause:squat` is 85–95%, meaning a pause squat is expected at 85–95% of the competition squat e1RM.

When an exercise has **multiple pct-bearing modifiers active simultaneously** (e.g. an SSB + pause squat has both `bar:ssb:squat` and `equipment:pause:squat`), `generateDiagnostics` combines them into a single expected range using **multiplicative scaling**:

```
combined_min = round(m1_min × m2_min / 100)   (applied iteratively)
combined_max = round(m1_max × m2_max / 100)
```

Starting from 100%, each modifier's range is applied in turn. `addl_wt` entries (chains, bands, reverse bands) carry no pct and are never included.

### Examples

| Exercise        | Modifiers                                               | Baseline |
| --------------- | ------------------------------------------------------- | -------- |
| SSB pause squat | bar:ssb:squat (90–95%) × equipment:pause:squat (85–95%) | 77–90%   |
| SSB box squat   | equipment:box:squat (90–100%) × bar:ssb:squat (90–95%)  | 81–95%   |
| Board press     | equipment:board:bench (105–115%)                        | 105–115% |

### Assumptions

1. **Modifier pct values are independent.** The expected difficulty of stacking an SSB with a pause is the product of the two individual difficulties, with no interaction term. In practice this may overestimate the combined penalty if the two modifiers share a root cause (e.g. both challenge the upper back), but there is no data available to fit interaction terms.
2. **Combined min ≤ combined max is preserved.** Because each modifier's `min ≤ max` and both are positive, multiplying min × min and max × max preserves the ordering after rounding.
3. **Order does not affect the result.** Multiplication is commutative; the final range is the same regardless of which modifier is applied first.
