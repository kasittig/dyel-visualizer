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
