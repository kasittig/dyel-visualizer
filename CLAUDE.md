# DYEL Calculator

A React web app that reads workout data from a Google Sheet and displays data visualizations.

## Stack

- **Vite + React + TypeScript** — scaffolded with `npm create vite@latest`
- **No UI library** — plain inline styles for now
- **No charting library yet** — to be chosen once visualization requirements are clearer

## Running the App

```bash
npm run dev
```

The dev server starts at `http://localhost:5173`. Vite must be running for the Google Sheets proxy to work (see below).

## Google Sheets Integration

The app fetches data from a Google Sheet that the user pastes a URL into. All fetching goes through a Vite dev server proxy (`/sheets-proxy`) defined in `vite.config.ts` to avoid CORS issues — Vite's built-in proxy doesn't follow redirects, so a custom plugin uses Node's `fetch` instead.

### Supported URL formats

The URL input (`App.tsx`) accepts:
- Edit/view URLs: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
- Published web URLs: `https://docs.google.com/spreadsheets/u/N/d/e/PUBLISHED_ID/pubhtml`
- Bare sheet IDs

For published sheet URLs, the export uses the `/pub?output=csv` endpoint. For regular sheet URLs, it uses `/export?format=csv`.

### Sheet format

The sheet has a title row above the headers. The CSV parser (`useSheetData.ts`) finds the header row by scanning for the first line containing `"Exercise"` rather than assuming line 1 is the header.

Current columns: `Date, Exercise, Sets, Weight (lbs), Reps, Est. 1RM, RPE, Notes, Bodyweight (lbs), Session Notes`

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useSheetData.ts` | Fetches + parses sheet CSV; returns typed `idle/loading/error/success` state |
| `src/components/ExerciseList.tsx` | Groups rows by exercise, shows last-performed date for each |
| `src/App.tsx` | URL input, sheet ID extraction, top-level layout |
| `vite.config.ts` | Sheets proxy plugin (follows redirects server-side) |

## Known Limitations

- The CSV parser is naive — cells containing commas will break parsing. Use `papaparse` if the sheet data ever includes commas in values.
- The Vite proxy is dev-only. A production deployment needs a server-side proxy (e.g. a Netlify/Vercel rewrite rule or edge function).
