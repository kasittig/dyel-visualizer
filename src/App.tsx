import { useState, useMemo } from "react";
import { useConjugateData } from "./hooks/useConjugateData";
import { ConjugateCharts } from "./components/ConjugateCharts";
import { ExerciseList } from "./components/ExerciseList";
import { ExerciseFilters } from "./components/ExerciseFilters";
import { BaselineSelect } from "./components/BaselineSelect";
import { applyFilters, emptyFilters } from "./utils/exerciseFilters";
import type { ConjugateDataPair } from "./hooks/useConjugateData";
import type { FilterState } from "./utils/exerciseFilters";

function defaultBaselineName(rows: ConjugateDataPair[]): string | null {
  let first: string | null = null;
  const seen = new Set<string>();
  for (const [ex] of rows) {
    if (seen.has(ex.displayName)) continue;
    seen.add(ex.displayName);
    if (first === null) first = ex.displayName;
    if (
      ex.bar === "standard" &&
      ex.stance === "competition" &&
      ex.equipment === null &&
      ex.addlWts.length === 0
    )
      return ex.displayName;
  }
  return first;
}

type SheetRef = { id: string; published: boolean };
type LiftTab = "squat" | "bench" | "deadlift" | "accessory";

const MAIN_TABS: { id: LiftTab; label: string }[] = [
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
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRPu7N-kHeJeUVhjbL0Q9xDLXEPeC3GsvnAE4HXj2-q9pIjM25BxUwUVxHYqxVR-9uQvW9MKM4l9xNI/pub?gid=1297658251&single=true&output=csv";
const EXAMPLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1Uwfzrb4wjYcBisTPdNEUGJyvfKRLwpN0tm8ciRPHB0c/edit?gid=1297658251#gid=1297658251";
const EXAMPLE_VISUALIZER_URL = `?sheet=${encodeURIComponent(EXAMPLE_CSV_URL)}`;

function App() {
  const params = new URLSearchParams(window.location.search);
  const [url, setUrl] = useState(params.get("sheet") ?? import.meta.env.VITE_SHEET_URL ?? "");
  const [activeTab, setActiveTab] = useState<LiftTab>("squat");
  const [hiddenVariations, setHiddenVariations] = useState<Record<LiftTab, Set<string>>>({
    squat: new Set(),
    bench: new Set(),
    deadlift: new Set(),
    accessory: new Set(),
  });
  const [filterState, setFilterState] = useState<Record<LiftTab, FilterState>>({
    squat: emptyFilters(),
    bench: emptyFilters(),
    deadlift: emptyFilters(),
    accessory: emptyFilters(),
  });
  const [baselineNames, setBaselineNames] = useState<Partial<Record<LiftTab, string>>>({});
  const sheetRef = extractSheetRef(url);
  const invalidUrl = url.length > 0 && !sheetRef;

  const state = useConjugateData(sheetRef);

  const pairs = state.status === "success" ? state.pairs : [];

  const squatRows = useMemo(() => pairs.filter(([ex]) => ex.type === "squat"), [pairs]);
  const benchRows = useMemo(() => pairs.filter(([ex]) => ex.type === "bench"), [pairs]);
  const deadliftRows = useMemo(() => pairs.filter(([ex]) => ex.type === "deadlift"), [pairs]);
  const accessoryRows = useMemo(() => pairs.filter(([ex]) => ex.type === "accessory"), [pairs]);

  const effectiveBaselineNames = useMemo(() => {
    const tabRows: Record<LiftTab, ConjugateDataPair[]> = {
      squat: squatRows,
      bench: benchRows,
      deadlift: deadliftRows,
      accessory: [],
    };
    const result: Partial<Record<LiftTab, string>> = {};
    for (const tab of ["squat", "bench", "deadlift"] as LiftTab[]) {
      const name = baselineNames[tab] ?? defaultBaselineName(tabRows[tab]);
      if (name) result[tab] = name;
    }
    return result;
  }, [squatRows, benchRows, deadliftRows, baselineNames]);

  const activeRows =
    activeTab === "squat"
      ? squatRows
      : activeTab === "bench"
        ? benchRows
        : activeTab === "deadlift"
          ? deadliftRows
          : accessoryRows;

  const filteredRows = useMemo(
    () => applyFilters(activeRows, filterState[activeTab]),
    [activeRows, filterState, activeTab]
  );

  const effectiveHidden = hiddenVariations[activeTab];

  function toggleInSet<T>(set: Set<T>, item: T): Set<T> {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  }

  function toggleVariation(label: string) {
    setHiddenVariations((prev) => ({ ...prev, [activeTab]: toggleInSet(prev[activeTab], label) }));
  }

  function toggleFilter(facet: keyof FilterState, value: string) {
    setFilterState((prev) => {
      const current = prev[activeTab];
      const next = new Set(current[facet]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [activeTab]: { ...current, [facet]: next } };
    });
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", textAlign: "left" }}>
      <div style={{ textAlign: "center" }}>
        <h1>DYEL Visualizer</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text)", marginTop: "-0.5rem" }}>
          <a href="?page=conjugate" style={{ color: "var(--accent)" }}>
            What is the conjugate method?
          </a>
        </p>
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}
        >
          <label htmlFor="sheet-url" style={{ whiteSpace: "nowrap" }}>
            Your Google Sheet
          </label>
          <input
            id="sheet-url"
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setHiddenVariations({
                squat: new Set(),
                bench: new Set(),
                deadlift: new Set(),
                accessory: new Set(),
              });
              setFilterState({
                squat: emptyFilters(),
                bench: emptyFilters(),
                deadlift: emptyFilters(),
                accessory: emptyFilters(),
              });
              setBaselineNames({});
            }}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            style={{ flex: 1, padding: "0.5rem", boxSizing: "border-box" }}
          />
        </div>
        {invalidUrl && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>
            That doesn't look like a Google Sheet URL.
          </p>
        )}
        <p style={{ fontSize: "0.85rem", color: "var(--text)", marginTop: "0.5rem" }}>
          Don't have a sheet? <a href={EXAMPLE_VISUALIZER_URL}>View an example in the visualizer</a>
          {" · "}
          <a href={EXAMPLE_SHEET_URL} target="_blank" rel="noreferrer">
            View the example spreadsheet
          </a>
        </p>
      </div>

      <div style={{ marginTop: "1rem" }}>
        {state.status === "loading" && <p>Loading…</p>}
        {state.status === "error" && <p style={{ color: "red" }}>{state.message}</p>}
        {state.status === "success" && (
          <>
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                borderBottom: "2px solid var(--border)",
                marginBottom: "1rem",
              }}
            >
              {[
                ...MAIN_TABS,
                ...(accessoryRows.length > 0
                  ? [{ id: "accessory" as LiftTab, label: "Accessories" }]
                  : []),
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom:
                      activeTab === id ? "2px solid var(--accent)" : "2px solid transparent",
                    marginBottom: "-2px",
                    padding: "0.4rem 0",
                    cursor: "pointer",
                    fontWeight: activeTab === id ? 700 : 400,
                    fontSize: "1rem",
                    color: activeTab === id ? "var(--accent)" : "var(--text-h)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {activeTab !== "accessory" && (
              <>
                <BaselineSelect
                  rows={activeRows}
                  selectedName={effectiveBaselineNames[activeTab] ?? null}
                  onSelect={(name) => setBaselineNames((prev) => ({ ...prev, [activeTab]: name }))}
                />
                <ExerciseFilters
                  rows={activeRows}
                  filters={filterState[activeTab]}
                  onToggle={toggleFilter}
                />
                <ConjugateCharts rows={filteredRows} hidden={effectiveHidden} />
              </>
            )}
            <ExerciseList
              rows={activeTab === "accessory" ? activeRows : filteredRows}
              hidden={effectiveHidden}
              onToggle={toggleVariation}
              baselineNames={activeTab === "accessory" ? {} : effectiveBaselineNames}
              heading={activeTab === "accessory" ? "Accessories" : "Variations"}
              columnHeader={activeTab === "accessory" ? "Exercise" : "Variation"}
              showSearch={activeTab === "accessory"}
            />
          </>
        )}
      </div>
    </main>
  );
}

export default App;
