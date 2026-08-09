# Exercise alternatives QA

Final integration evidence for #662, covering the standalone Exercise alternatives flow from
issue #656.

## Automated verification

- `npm test`: passed (642 API, 439 app, and 269 pipeline tests).
- `npm run build -w packages/pipeline`: passed.
- `npm run build -w packages/api`: passed.
- `npm run build -w packages/app`: passed with a separate lazy-loaded alternatives chunk.

## Browser scenarios

Tested in Chromium at 1280 × 900 and 320 × 800.

1. Swiss-Bar Bench Press → Grip or handle → Grip feels too small
   - `Use a wider handle pair` appears first under adjustments.
   - Dumbbell Bench Press and Barbell Bench Press follow as replacements.
2. Push-Up → Loading range → I cannot add enough resistance
   - Band-Resisted Push-Up appears first.
   - Its explanation states that band tension increases toward lockout.
3. Back Squat → Spinal loading
   - Belt Squat and Leg Press shift direct external loading without claiming to eliminate spinal
     demand.

## Accessibility and responsive checks

- Completed exercise selection using keyboard input, ArrowDown, and Enter; native radio controls
  follow visible focus order.
- Verified visible labels, semantic heading/list structure, text explanations independent of color,
  and a polite live-region result count.
- Verified no horizontal overflow at 320 px (`scrollWidth === clientWidth`).
- Verified the dropdown lists canonical exercises once, retains alias search, and groups options in
  Squat, Bench, Deadlift order.
- Observed no console errors, feature-attributable failed requests, or sheet-proxy requests.

## Routing regression checks

- `/alternatives` and `?page=alternatives` render the standalone page.
- `/dyel-visualizer/alternatives` produces a base-path-safe return link.
- The visualizer root and Conjugate help page continue to render.
