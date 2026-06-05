# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at http://localhost:5173
npm run build     # tsc -b && vite build
npm test          # run all tests (vitest run --passWithNoTests)
npm run lint      # eslint

# run a single test file
npx vitest run src/hooks/useSheetData.test.ts
```

## Architecture

The app is a single-page React app with no backend. All data comes from a user-supplied Google Sheet URL.

**Data flow:**
1. `App.tsx` takes a URL, calls `extractSheetRef()` to parse it into `{ id, published }`, and passes it to `useSheetData()`
2. `useSheetData` (in `src/hooks/useSheetData.ts`) fetches the sheet as CSV, skips any title rows above the header by scanning for the first line containing `"exercise"`, then parses with papaparse (headers are lowercased, values are trimmed)
3. The resulting `SheetRow[]` (`Record<string, string>`) is passed down to `ExerciseList` and `Charts`
4. `Charts` is lazy-loaded via `React.lazy` so recharts doesn't bloat the initial bundle
5. `ErrorBoundary` (in `src/components/ErrorBoundary.tsx`) wraps `<App />` in `main.tsx`

**Finding columns:** Use `findCol(row, keyword)` from `useSheetData.ts` rather than direct key access. It matches the keyword at a word boundary (e.g. `"weight"` matches `"weight (lbs)"` but not `"bodyweight (lbs)"`).

**Dev proxy:** `vite.config.ts` defines a `sheetsProxyPlugin` that forwards `/sheets-proxy/*` to `https://docs.google.com/*` using Node's `fetch` (which follows redirects server-side, avoiding CORS). In production, `useSheetData` hits Google directly — this only works with published sheets.

## Constraints

**Published sheets only.** The app must only support features that work with published Google Sheets (`/pub?output=csv`). Do not add features that require the `/export?format=csv` endpoint — it only works for sheets that are publicly accessible without publishing, which is a rare configuration.

**TypeScript config split:** `tsconfig.node.json` only includes `vite.config.ts`; `tsconfig.app.json` only includes `src/`. The test config lives in `vitest.config.ts` (not in `vite.config.ts`) because Vitest 3 bundles its own Vite 7, whose types conflict with the project's Vite 8 — embedding a `test:` block in `vite.config.ts` breaks `tsc -b`.
