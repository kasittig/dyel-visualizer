# analyze/ — diagnostics from normalization residuals

Expected variant e1RM = model factor × current baseline e1RM. Deviations flag
weaknesses in the qualities that variant trains (`effects`, computed during tagging and
passed in as a canonical→effects map). Pure analysis — outputs are computed fresh every
run and NEVER stored on identity types.

## Contract

    function diagnose(
      points,
      model,
      effectsByCanonical,
      opts: { tolerance; staleDays },
      now: number | undefined,
      displayNameByCanonical?,
      baselineRangeByCanonical?
    ): DiagnosticsReport

- `displayNameByCanonical` (optional, defaults to empty map): resolves human-readable
  exercise name per canonical id. When a display name is available, it's copied into
  `VariantAssessment.displayName`; otherwise falls back to canonical.
- `baselineRangeByCanonical` (optional, defaults to empty map): supplies modifier-derived
  expected %-range per canonical for the independent fitted, long-term signal. When a range
  exists, `VariantAssessment.expectedBaseline` is populated and `fittedStatus` compares the
  fitted variant factor against it; without a range, `fittedStatus` is `null`.
- `VariantAssessment.ratio` = actual / expected. Actual is the latest bar-weight e1RM point.
  The pipeline supplies max-effort-only points, excluding dynamic-effort volume days from
  both the actual and baseline observations used by diagnostics.
  For chain/band variants, expected bar-weight e1RM is the fitted total-resistance expectation
  minus the model's estimated additional-weight offset. `status` is the current-readiness signal
  and always compares this ratio
  against `opts.tolerance`. Possible values:
  - `'optimal'` — current ratio within tolerance.
  - `'weakness'` — current ratio below tolerance.
  - `'overperforming'` — current ratio above tolerance.
  - `'stale'` — latest point is older than `staleDays`. Staleness takes priority
    and overrides any normal range/tolerance classification, so a stale variant is
    always marked `'stale'` regardless of underlying ratio. Stale variants still
    compute `ratio`, `averageIndex`, and `expectedBaseline` normally (useful for
    display), but do not contribute votes to weakness aggregation.
- `VariantAssessment.fittedStatus` is the separately named long-term signal. It compares
  `averageIndex` (the fitted factor as a percentage) with `expectedBaseline`, returning
  `'optimal'`, `'weakness'`, or `'overperforming'`; it is `null` when no fitted target range
  exists. It never changes the current `status`, so disagreement remains explicit.
- `VariantAssessment.isCompLift` — mirrors the record's `'comp-lift'` tag; true only for
  the bare squat/bench/deadlift competition lifts, never for variants or accessories.
- `VariantAssessment.addlWtOffset` (optional, only present when sample count > 0):
  supplementary weight offset extracted from `model.addlWtOffset[canonical]`, stays in kg.
  Diagnostic display strings are the app's job; emit structured fields only. Consistent with
  the outputs-computed-fresh-every-run boundary: never stored on identity types, always
  derived from normalized model state.
- Drill-down provenance stays structured on each `VariantAssessment`: `baselineE1rmKg` and
  `expectedFactor` reproduce the expected-value calculation; `latestAt` and
  `previousE1rmKg` support recency/trend display; `observationCount` counts the variation's
  e1RM observations and `comparisonCount` reports the fitted relationship's sample count;
  it is `null` for baseline lifts because their identity factor is not fitted from comparisons.
- Weakness aggregation is a SIGNED VOTE COUNT per quality: each non-stale 'weakness'
  variant with the quality → +1, each non-stale 'overperforming' variant → −1,
  'optimal' → 0, 'stale' → 0 (no votes). Report qualities with score > 0; evidence
  lists contributing canonicals from BOTH non-stale signs.
- Unassessed lift variations are structured as canonical/display name/lift/reason. `diagnose`
  emits missing-factor and missing-baseline findings for classified primary lifts; the pipeline
  appends missing-lift findings from `unknownExercises`, since unknown records have already been
  classified as accessories before points reach `diagnose`. Missing-lift findings deliberately
  remain unscoped (`lift: null`) so consumers can distinguish recognition failures. Reason codes
  are `missing-lift`, `missing-factor`, or `missing-baseline`. Accessory-only records are outside
  lift normalization and omitted rather than mislabeled as needing comparison history. Staleness alone no
  longer routes to `unassessed`; instead, stale variants appear in `variants` with
  `status: 'stale'`.

## Boundaries

- Sibling of dataset/ — never import from it or export to it.
- Diagnostic display strings are the app's job; emit structured fields only.
- Defaults for `tolerance` and `staleDays` are needs-design — flag,
  don't invent.
