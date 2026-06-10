import { useState, useMemo } from "react";
import { useSheetData } from "./hooks/useSheetData";
import { ConjugateCharts } from "./components/ConjugateCharts";
import { ConjugateFilterControls } from "./components/ConjugateFilterControls";
import { ExerciseList } from "./components/ExerciseList";
import type { ConjugateLift } from "./types/conjugate";
import {
  DEFAULT_BENCH_FILTER,
  DEFAULT_DEADLIFT_FILTER,
  DEFAULT_SQUAT_FILTER,
} from "./types/conjugateFilters";
import type { BenchFilter, DeadliftFilter, SquatFilter } from "./types/conjugateFilters";
import {
  getBenchPresence,
  getDeadliftPresence,
  getFilteredOutLabels,
  getSquatPresence,
} from "./utils/conjugateFilters";
import type { FilteredOutQuery } from "./utils/conjugateFilters";
import { parseConjugateRows } from "./utils/parseConjugate";

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
  const [activeTab, setActiveTab] = useState<LiftTab>("squat");
  const [hiddenVariations, setHiddenVariations] = useState<Record<LiftTab, Set<string>>>({
    squat: new Set(),
    bench: new Set(),
    deadlift: new Set(),
  });
  const [squatFilter, setSquatFilter] = useState<SquatFilter>(DEFAULT_SQUAT_FILTER);
  const [benchFilter, setBenchFilter] = useState<BenchFilter>(DEFAULT_BENCH_FILTER);
  const [deadliftFilter, setDeadliftFilter] = useState<DeadliftFilter>(DEFAULT_DEADLIFT_FILTER);
  const sheetRef = extractSheetRef(url);
  const invalidUrl = url.length > 0 && !sheetRef;

  const state = useSheetData(sheetRef);

  const currentQuery = useMemo<FilteredOutQuery>(
    () =>
      activeTab === "squat"
        ? { liftType: "squat", filter: squatFilter }
        : activeTab === "bench"
          ? { liftType: "bench", filter: benchFilter }
          : { liftType: "deadlift", filter: deadliftFilter },
    [activeTab, squatFilter, benchFilter, deadliftFilter]
  );

  const parsedConjugateRows = useMemo(
    () => (state.status === "success" ? parseConjugateRows(state.rows) : []),
    [state]
  );

  const squatRows = useMemo(
    () => parsedConjugateRows.filter((p) => p.lift?.liftType === "squat"),
    [parsedConjugateRows]
  );
  const benchRows = useMemo(
    () => parsedConjugateRows.filter((p) => p.lift?.liftType === "bench"),
    [parsedConjugateRows]
  );
  const deadliftRows = useMemo(
    () => parsedConjugateRows.filter((p) => p.lift?.liftType === "deadlift"),
    [parsedConjugateRows]
  );

  const squatPresence = useMemo(() => getSquatPresence(squatRows), [squatRows]);
  const benchPresence = useMemo(() => getBenchPresence(benchRows), [benchRows]);
  const deadliftPresence = useMemo(() => getDeadliftPresence(deadliftRows), [deadliftRows]);
  const presence = useMemo(
    () => ({ squat: squatPresence, bench: benchPresence, deadlift: deadliftPresence }),
    [squatPresence, benchPresence, deadliftPresence]
  );

  const activeRows =
    activeTab === "squat" ? squatRows : activeTab === "bench" ? benchRows : deadliftRows;

  const filteredOutLabels = useMemo(
    () => getFilteredOutLabels(activeRows, currentQuery),
    [activeRows, currentQuery]
  );

  const effectiveHidden = new Set([...hiddenVariations[activeTab], ...filteredOutLabels]);

  function toggleInSet<T>(set: Set<T>, item: T): Set<T> {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  }

  function toggleVariation(label: string) {
    setHiddenVariations((prev) => ({ ...prev, [activeTab]: toggleInSet(prev[activeTab], label) }));
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "700px" }}>
      <h1>DYEL Visualizer</h1>
      <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "-0.5rem" }}>
        <a href="?page=conjugate" style={{ color: "#6366f1" }}>
          What is the conjugate method?
        </a>
      </p>
      <label htmlFor="sheet-url" style={{ display: "block", marginBottom: "0.5rem" }}>
        Google Sheet URL
      </label>
      <input
        id="sheet-url"
        type="text"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
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
                    borderBottom: activeTab === id ? "2px solid #6366f1" : "2px solid transparent",
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
              presence={presence}
              squatFilter={squatFilter}
              benchFilter={benchFilter}
              deadliftFilter={deadliftFilter}
              onSquatChange={setSquatFilter}
              onBenchChange={setBenchFilter}
              onDeadliftChange={setDeadliftFilter}
            />
            <ConjugateCharts rows={activeRows} hidden={effectiveHidden} />
            <ExerciseList
              rows={activeRows}
              hidden={effectiveHidden}
              onToggle={toggleVariation}
              heading="Variations"
              columnHeader="Variation"
            />
          </>
        )}
      </div>
    </main>
  );
}

export default App;
