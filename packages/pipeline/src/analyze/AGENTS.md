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
  expected %-range per canonical for status classification. When a range exists for a
  canonical, `VariantAssessment.expectedBaseline` is populated and drives `status`
  determination; when absent, status falls back to flat-tolerance `ratio` comparison.
- `VariantAssessment.ratio` = actual / expected (actual = latest e1rm point,
  pre-normalization). `status` classification is determined by comparing ratio or
  fitted variant-factor strength against tolerance/range bands. Possible values:
  - `'optimal'` — ratio/fitted strength within tolerance/range.
  - `'weakness'` — ratio/fitted strength below tolerance/range minimum.
  - `'overperforming'` — ratio/fitted strength above tolerance/range maximum.
  - `'stale'` — latest point is older than `staleDays`. Staleness takes priority
    and overrides any normal range/tolerance classification, so a stale variant is
    always marked `'stale'` regardless of underlying ratio. Stale variants still
    compute `ratio`, `averageIndex`, and `expectedBaseline` normally (useful for
    display), but do not contribute votes to weakness aggregation.
- `VariantAssessment.isCompLift` — mirrors the record's `'comp-lift'` tag; true only for
  the bare squat/bench/deadlift competition lifts, never for variants or accessories.
- `VariantAssessment.addlWtOffset` (optional, only present when sample count > 0):
  supplementary weight offset extracted from `model.addlWtOffset[canonical]`, stays in kg.
  Diagnostic display strings are the app's job; emit structured fields only. Consistent with
  the outputs-computed-fresh-every-run boundary: never stored on identity types, always
  derived from normalized model state.
- Weakness aggregation is a SIGNED VOTE COUNT per quality: each non-stale 'weakness'
  variant with the quality → +1, each non-stale 'overperforming' variant → −1,
  'optimal' → 0, 'stale' → 0 (no votes). Report qualities with score > 0; evidence
  lists contributing canonicals from BOTH non-stale signs.
- Unassessed canonicals: those with no `lift:` tag, no fitted `variantFactor`, or no
  baseline latest point (i.e., genuinely cannot be assessed). Staleness alone no
  longer routes to `unassessed`; instead, stale variants appear in `variants` with
  `status: 'stale'`.

## Boundaries

- Sibling of dataset/ — never import from it or export to it.
- Diagnostic display strings are the app's job; emit structured fields only.
- Defaults for `tolerance` and `staleDays` are needs-design — flag,
  don't invent.
