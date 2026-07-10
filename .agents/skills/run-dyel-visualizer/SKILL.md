---
name: run-dyel-visualizer
description: Build, run, and drive the dyel-visualizer React app. Use when asked to start dyel-visualizer, run its dev server, take a screenshot of its UI, interact with the running app, or run its tests.
---

A React/Vite single-page app that visualizes conjugate powerlifting data from a Google Sheet. Drive it by starting the Vite dev server then running `.agents/skills/run-dyel-visualizer/driver.mjs` (Playwright-based) to navigate, interact, and screenshot. All paths below are relative to the repo root.

## Prerequisites

Playwright and Chromium must be available. The skill's own `node_modules` ships playwright — no global install needed. The Chromium browser is cached by npx on first use:

```bash
npx playwright install chromium   # one-time; skips if already cached
```

No other system packages are needed on macOS. On Linux, you'll need `xvfb` and the standard Chromium apt dependencies (see Troubleshooting).

## Setup

```bash
npm install   # install all workspace deps from repo root
```

Optional: set `VITE_SHEET_URL` in `packages/app/.env.local` to pre-fill a sheet URL during dev — otherwise the app opens with a "Getting Started" empty state asking for a sheet URL.

## Dev server

Start and stop:

```bash
# Start (from repo root)
npx kill-port 5173 && npm run dev > /tmp/dyel-dev.log 2>&1 &
echo $! > /tmp/dyel-dev.pid
# Wait until ready (macOS — no `timeout` builtin)
until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done && echo "ready"

# Stop
kill $(cat /tmp/dyel-dev.pid) 2>/dev/null; rm -f /tmp/dyel-dev.pid
```

The dev server runs at `http://localhost:5173`. Vite compiles TypeScript from source — no build step needed. If the port is already in use, `npx kill-port 5173` clears it.

## Run (agent path)

After the dev server is ready, use the driver to navigate and screenshot:

```bash
# Default: main visualizer (Σ tab), saves screenshot to /tmp/dyel-shots/
node .agents/skills/run-dyel-visualizer/driver.mjs

# Options:
node .agents/skills/run-dyel-visualizer/driver.mjs --out /tmp/shots        # custom output dir
node .agents/skills/run-dyel-visualizer/driver.mjs --page index            # index page (?page=index)
node .agents/skills/run-dyel-visualizer/driver.mjs --page conjugate        # conjugate info page
node .agents/skills/run-dyel-visualizer/driver.mjs --sheet-url "https://..." # pass a sheet URL
```

Screenshots land in `--out` (default `/tmp/dyel-shots/`) as `<label>-<timestamp>.png`.

For tab interaction and multi-step flows, write an inline Playwright script (the driver is the starting point — extend or duplicate it):

```bash
cat > /tmp/dyel-flow.mjs << 'EOF'
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)(
  '/path/to/dyel-visualizer/.agents/skills/run-dyel-visualizer/node_modules/playwright'
);
import { mkdir } from 'fs/promises';
await mkdir('/tmp/dyel-shots', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const pg = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await pg.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
await pg.click('text=Squat');          // click the Squat tab
await pg.waitForTimeout(500);
await pg.screenshot({ path: '/tmp/dyel-shots/squat.png', fullPage: true });
await browser.close();
EOF
node /tmp/dyel-flow.mjs
```

Pages and tabs:

- Default (`/`): main visualizer — tabs: Σ, Squat, Bench, Deadlift, Accessories, Calculator
- `?page=index`: index page listing linked sheets
- `?page=conjugate`: conjugate method info (markdown)
- `?page=validator`: sheet/pasted-text structural validator
- `?page=pipeline-validation`: pipeline-level validation (parse errors, unknown exercises, normalization issues)

## Run (human path)

```bash
npx kill-port 5173 && npm run dev   # opens http://localhost:5173 in browser. Ctrl-C to stop.
```

## Test

```bash
npm test   # runs vitest in all workspaces
```

Expected: all tests pass in ~1s.

## Gotchas

- **`import { chromium } from 'playwright'` fails with Node 23 ESM.** Playwright ships CommonJS; named ESM imports don't work. Use `createRequire(import.meta.url)('playwright')` as the driver does.
- **`NODE_PATH` doesn't resolve ESM imports.** Only CommonJS respects `NODE_PATH`; ESM ignores it entirely. The driver resolves playwright from its own local `node_modules` via `createRequire`, which is why the skill directory has its own `package.json` and `node_modules`.
- **macOS has no `timeout` builtin.** Use a `until curl -sf ...; do sleep 1; done` loop instead.
- **`networkidle` can stall if the app is waiting on Google Sheets.** Without `VITE_SHEET_URL` set and a valid sheet, the app enters an empty/loading state. The driver falls back to `waitForSelector('h1, [role="main"], .App, #root > *')` which always resolves.
- **Index page renders empty without network.** The `?page=index` page fetches a hardcoded published Google Sheet; in a sandboxed/offline environment the list will be blank but the page header still renders.
- **Dev server uses a Vite sheets proxy.** In dev, sheet CSV requests go through `/sheets-proxy/*` (a Vite plugin in `packages/app/vite.config.ts`) to avoid CORS. This only works when the dev server is running — production builds hit Google directly.

## Troubleshooting

- **`Cannot find package 'playwright'`**: The skill's `node_modules` is missing. Run `npm install` inside `.agents/skills/run-dyel-visualizer/` to install it there.
- **`EADDRINUSE` on port 5173**: Another dev server is running. Run `npx kill-port 5173` before starting.
- **`ERR_MODULE_NOT_FOUND` for the driver itself**: Run from the repo root — `node .agents/skills/run-dyel-visualizer/driver.mjs` — not from inside the skill directory.
- **Blank screenshot / only title visible**: `VITE_SHEET_URL` is not set and no `?url=` param was passed. The app shows "Getting Started" state; this is correct behavior, not an error.
