import { useState, lazy, Suspense } from "react";
import { useSheetData } from "./hooks/useSheetData";
import { ConjugateCharts } from "./components/ConjugateCharts";
import { ConjugateExerciseList } from "./components/ConjugateExerciseList";
import { ConjugateFilterControls } from "./components/ConjugateFilterControls";
import { ExerciseList } from "./components/ExerciseList";
import type { ConjugateLift } from "./types/conjugate";
import {
  DEFAULT_BENCH_FILTER,
  DEFAULT_DEADLIFT_FILTER,
  DEFAULT_SQUAT_FILTER,
} from "./types/conjugateFilters";
import type { BenchFilter, DeadliftFilter, SquatFilter } from "./types/conjugateFilters";
import { getFilteredOutLabels } from "./utils/conjugateFilters";
import "./App.css";

const Charts = lazy(() => import("./components/Charts").then((m) => ({ default: m.Charts })));

type SheetRef = { id: string; published: boolean };
type LiftTab = ConjugateLift["liftType"];

const TABS: { id: LiftTab; label: string }[] = [
  { id: "squat", label: "Squat" },
  { id: "bench", label: "Bench" },
  { id: "deadlift", label: "Deadlift" },
];

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

function App() {
  const params = new URLSearchParams(window.location.search);
  const [url, setUrl] = useState(params.get("sheet") ?? import.meta.env.VITE_SHEET_URL ?? "");
  const [conjugateMode, setConjugateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<LiftTab>("squat");
  const [hiddenVariations, setHiddenVariations] = useState<Record<LiftTab, Set<string>>>({
    squat: new Set(),
    bench: new Set(),
    deadlift: new Set(),
  });
  const [squatFilter, setSquatFilter] = useState<SquatFilter>(DEFAULT_SQUAT_FILTER);
  const [benchFilter, setBenchFilter] = useState<BenchFilter>(DEFAULT_BENCH_FILTER);
  const [deadliftFilter, setDeadliftFilter] = useState<DeadliftFilter>(DEFAULT_DEADLIFT_FILTER);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const sheetRef = extractSheetRef(url);
  const invalidUrl = url.length > 0 && !sheetRef;

  const state = useSheetData(sheetRef);

  const exercises =
    state.status === "success"
      ? ([
          ...new Set(state.rows.map((r) => r["exercise"]?.trim()).filter(Boolean)),
        ].sort() as string[])
      : [];

  const effectiveExercise = selectedExercise ?? exercises[0] ?? null;

  const currentFilter =
    activeTab === "squat" ? squatFilter : activeTab === "bench" ? benchFilter : deadliftFilter;

  const filteredOutLabels =
    state.status === "success"
      ? getFilteredOutLabels(state.rows, activeTab, currentFilter)
      : new Set<string>();

  const effectiveHidden = new Set([...hiddenVariations[activeTab], ...filteredOutLabels]);

  function toggleVariation(label: string) {
    setHiddenVariations((prev) => {
      const tabSet = new Set(prev[activeTab]);
      if (tabSet.has(label)) tabSet.delete(label);
      else tabSet.add(label);
      return { ...prev, [activeTab]: tabSet };
    });
  }

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
        onChange={(e) => {
          setUrl(e.target.value);
          setSelectedExercise(null);
          setHiddenVariations({ squat: new Set(), bench: new Set(), deadlift: new Set() });
          setSquatFilter(DEFAULT_SQUAT_FILTER);
          setBenchFilter(DEFAULT_BENCH_FILTER);
          setDeadliftFilter(DEFAULT_DEADLIFT_FILTER);
        }}
        placeholder="https://docs.google.com/spreadsheets/d/…"
        style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }}
      />
      {invalidUrl && (
        <p style={{ color: "red", marginTop: "0.5rem" }}>
          That doesn't look like a Google Sheet URL.
        </p>
      )}
      <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.5rem" }}>
        Don't have a sheet? <a href={EXAMPLE_VISUALIZER_URL}>View an example in the visualizer</a>
        {" · "}
        <a href={EXAMPLE_SHEET_URL} target="_blank" rel="noreferrer">
          View the example spreadsheet
        </a>
      </p>

      <div style={{ marginTop: "1rem" }}>
        {state.status === "loading" && <p>Loading…</p>}
        {state.status === "error" && <p style={{ color: "red" }}>{state.message}</p>}
        {state.status === "success" && (
          <>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              <input
                type="checkbox"
                checked={conjugateMode}
                onChange={(e) => setConjugateMode(e.target.checked)}
              />
              Conjugate Mode
            </label>

            {conjugateMode ? (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    borderBottom: "2px solid #e5e7eb",
                    marginBottom: "1rem",
                  }}
                >
                  {TABS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      style={{
                        background: "none",
                        border: "none",
                        borderBottom:
                          activeTab === id ? "2px solid #6366f1" : "2px solid transparent",
                        marginBottom: "-2px",
                        padding: "0.4rem 0",
                        cursor: "pointer",
                        fontWeight: activeTab === id ? 700 : 400,
                        fontSize: "1rem",
                        color: activeTab === id ? "#6366f1" : "#374151",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <ConjugateFilterControls
                  liftType={activeTab}
                  squatFilter={squatFilter}
                  benchFilter={benchFilter}
                  deadliftFilter={deadliftFilter}
                  onSquatChange={setSquatFilter}
                  onBenchChange={setBenchFilter}
                  onDeadliftChange={setDeadliftFilter}
                />
                <ConjugateCharts rows={state.rows} liftType={activeTab} hidden={effectiveHidden} />
                <ConjugateExerciseList
                  rows={state.rows}
                  liftType={activeTab}
                  hidden={effectiveHidden}
                  onToggle={toggleVariation}
                />
              </>
            ) : (
              <>
                <Suspense fallback={<p>Loading charts…</p>}>
                  <Charts rows={state.rows} selectedExercise={effectiveExercise} />
                </Suspense>
                <ExerciseList
                  rows={state.rows}
                  selectedExercise={effectiveExercise}
                  onSelectExercise={setSelectedExercise}
                />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default App;
