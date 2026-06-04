import { useState } from "react";
import { useSheetData } from "./hooks/useSheetData";
import { ExerciseList } from "./components/ExerciseList";
import { Charts } from "./components/Charts";
import "./App.css";

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

type Tab = "exercises" | "charts";

function App() {
  const [url, setUrl] = useState("");
  const [tab, setTab] = useState<Tab>("exercises");
  const sheetRef = extractSheetRef(url);
  const invalidUrl = url.length > 0 && !sheetRef;

  const state = useSheetData(sheetRef);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "700px" }}>
      <h1>DYEL Calculator</h1>
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
            {tab === "charts" && <Charts rows={state.rows} />}
          </>
        )}
      </div>
    </main>
  );
}

export default App;
