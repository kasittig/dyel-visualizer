# Mobile regression checklist

Run `npm run test:mobile -w packages/app` before merging layout or navigation changes. The check
opens the primary app, calculator, validator, and team views at 320, 375, 390, and 430px and fails
when the page itself scrolls horizontally. Intentionally wide tables may scroll inside their own
container.

## Manual device pass

Record the device, OS/browser version, result, and any linked follow-up issue in the PR. Test at
least current iOS Safari and Android Chrome.

- Navigate every primary destination with touch and a keyboard; focus must stay visible.
- Verify icon-only controls have an accessible name and the selected destination is announced.
- Open date, effort, and search overlays near every viewport edge.
- With the software keyboard visible, edit each input and confirm the active input and overlay stay
  reachable without page-level horizontal scrolling.
- Check sticky surfaces against the notch, status area, and home indicator in portrait and
  landscape.
- Enable reduced motion and confirm no meaningful information depends on animation.
- Check text, controls, focus rings, statuses, and chart series in light and dark system themes.
- At 200% browser zoom, confirm content reflows and actions remain operable.

Real-device hardware is required for the final iOS/Android sign-off; the automated Chromium pass is
a regression guard, not a substitute.
