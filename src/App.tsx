import { useState, lazy, Suspense } from "react";
import { useSheetData } from "./hooks/useSheetData";
import { ExerciseList } from "./components/ExerciseList";
import "./App.css";

const Charts = lazy(() =>
  import("./components/Charts").then((m) => ({ default: m.Charts }))
);

type SheetRef = { id: string; published: boolean };

function extractSheetRef(input: string): SheetRef | null {
  // Published web URL: .../d/e/PUBLISHED_ID/pubhtml (may have /u/N/ before /d/)
  const publishedMatch = input.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (publishedMatch) return { id: publishedMatch[1], published: true };
  // Edit/view URL: .../d/SHEET_ID/
  const regularMatch = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (regularMatch) return { id: regularMatch[1], published: false };
  // Bare ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return { id: input.trim(), published: false };
  return null;
}

const EXAMPLE_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQqznDyoxzza0HTmngCevHvq8wg7hOH5-wHb0NHwl9MEaBRf5yZAzRCvHA9ixbMEE6DJfrXAHjNCaS5/pub?output=csv";
const EXAMPLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQqznDyoxzza0HTmngCevHvq8wg7hOH5-wHb0NHwl9MEaBRf5yZAzRCvHA9ixbMEE6DJfrXAHjNCaS5/pubhtml";
const EXAMPLE_VISUALIZER_URL = `?sheet=${encodeURIComponent(EXAMPLE_CSV_URL)}`;

type Tab = "exercises" | "charts";

function App() {
  const params = new URLSearchParams(window.location.search);
  const [url, setUrl] = useState(params.get("sheet") ?? import.meta.env.VITE_SHEET_URL ?? "");
  const [tab, setTab] = useState<Tab>("exercises");
  const sheetRef = extractSheetRef(url);
  const invalidUrl = url.length > 0 && !sheetRef;

  const state = useSheetData(sheetRef);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "700px" }}>
      <h1>DYEL Visualizer</h1>
      <label htmlFor="sheet-url" style={{ display: "block", marginBottom: "0.5rem" }}>
        Google Sheet URL
      </label>
      <input
        id="sheet-url"
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://docs.google.com/spreadsheets/d/…"
        style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }}
      />
      {invalidUrl && (
        <p style={{ color: "red", marginTop: "0.5rem" }}>
          That doesn't look like a Google Sheet URL.
        </p>
      )}
      <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.5rem" }}>
        Don't have a sheet?{" "}
        <a href={EXAMPLE_VISUALIZER_URL}>View an example in the visualizer</a>
        {" · "}
        <a href={EXAMPLE_SHEET_URL} target="_blank" rel="noreferrer">View the example spreadsheet</a>
      </p>

      <div style={{ marginTop: "1rem" }}>
        {state.status === "loading" && <p>Loading…</p>}
        {state.status === "error" && (
          <p style={{ color: "red" }}>{state.message}</p>
        )}
        {state.status === "success" && (
          <>
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", borderBottom: "2px solid #e5e7eb" }}>
              {(["exercises", "charts"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontWeight: tab === t ? 600 : 400,
                    borderBottom: tab === t ? "2px solid #6366f1" : "2px solid transparent",
                    marginBottom: "-2px",
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            {tab === "exercises" && <ExerciseList rows={state.rows} />}
            {tab === "charts" && (
              <Suspense fallback={<p>Loading charts…</p>}>
                <Charts rows={state.rows} />
              </Suspense>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default App;
