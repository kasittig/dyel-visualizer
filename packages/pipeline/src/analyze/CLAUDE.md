# analyze/ — diagnostics from normalization residuals

Expected variant e1RM = model factor × current baseline e1RM. Deviations flag
weaknesses in the qualities that variant trains (`effects` from
exercise-map.json). Pure analysis — outputs are computed fresh every run and
NEVER stored on identity types.

## Contract

    function diagnose(points, model, map, opts: { tolerance; staleDays }): DiagnosticsReport

- `VariantAssessment.ratio` = actual / expected (actual = latest e1rm point,
  pre-normalization). `status` = ratio vs tolerance band:
  optimal | weakness | overperforming.
- Weakness aggregation is a SIGNED VOTE COUNT per quality: each 'weakness'
  variant with the quality → +1, each 'overperforming' variant → −1,
  'optimal' → 0. Report qualities with score > 0; evidence lists contributing
  canonicals from BOTH signs.
- Unfitted (model n < minSamples) or stale (> staleDays) variants → vote 0,
  listed in `unassessed`.

## Boundaries

- Sibling of dataset/ — never import from it or export to it.
- Diagnostic display strings are the app's job; emit structured fields only.
- Defaults for `tolerance` and `staleDays` are needs-design — flag,
  don't invent.
