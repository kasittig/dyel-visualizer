import { useState, useMemo, useEffect } from "react";
import { useConjugateData } from "./hooks/useConjugateData";
import { useLastSessionStats } from "./hooks/useLastSessionStats";
import { ConjugateCharts } from "./components/ConjugateCharts";
import { ExerciseList } from "./components/ExerciseList";
import { ExerciseFilters } from "./components/ExerciseFilters";
import { BaselineSelect } from "./components/BaselineSelect";
import { RepCalculator } from "./components/RepCalculator";
import { TotalChart } from "./components/TotalChart";
import { applyFilters, emptyFilters } from "@dyel/core";
import type { ConjugateDataPair } from "./hooks/useConjugateData";
import type { FilterState } from "@dyel/core";

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
type PageTab = LiftTab | "calculator" | "sigma";

type TabConfig = {
  id: LiftTab;
  label: string;
  heading: string;
  columnHeader: string;
  showSearch: boolean;
};

const MAIN_TABS: TabConfig[] = [
  {
    id: "squat",
    label: "Squat",
    heading: "Variations",
    columnHeader: "Variation",
    showSearch: false,
  },
  {
    id: "bench",
    label: "Bench",
    heading: "Variations",
    columnHeader: "Variation",
    showSearch: false,
  },
  {
    id: "deadlift",
    label: "Deadlift",
    heading: "Variations",
    columnHeader: "Variation",
    showSearch: false,
  },
];

const ACCESSORY_TAB: TabConfig = {
  id: "accessory",
  label: "Accessories",
  heading: "Accessories",
  columnHeader: "Exercise",
  showSearch: true,
};

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

function VolumeWorkToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div style={{ marginBottom: "1rem", fontSize: "0.8rem", color: "var(--text)" }}>
      <label style={{ cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{ marginRight: "0.4rem" }}
        />
        Exclude volume work (sets &gt; 1)
      </label>
    </div>
  );
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const [url, setUrl] = useState(params.get("sheet") ?? import.meta.env.VITE_SHEET_URL ?? "");
  const [activeTab, setActiveTab] = useState<PageTab>("sigma");
  const [shownVariations, setShownVariations] = useState<Record<LiftTab, Set<string>>>({
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
  const [excludeVolumeWork, setExcludeVolumeWork] = useState(true);
  const [baselineNames, setBaselineNames] = useState<Partial<Record<LiftTab, string>>>({});
  const [targetNames, setTargetNames] = useState<Partial<Record<LiftTab, string>>>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (url) params.set("sheet", url);
    else params.delete("sheet");
    history.replaceState(null, "", "?" + params.toString());
  }, [url]);

  const sheetRef = extractSheetRef(url);
  const invalidUrl = url.length > 0 && !sheetRef;

  const state = useConjugateData(sheetRef);

  const pairs = useMemo(() => (state.status === "success" ? state.pairs : []), [state]);

  const squatRows = useMemo(() => pairs.filter(([ex]) => ex.type === "squat"), [pairs]);
  const benchRows = useMemo(() => pairs.filter(([ex]) => ex.type === "bench"), [pairs]);
  const deadliftRows = useMemo(() => pairs.filter(([ex]) => ex.type === "deadlift"), [pairs]);
  const accessoryRows = useMemo(() => pairs.filter(([ex]) => ex.type === "accessory"), [pairs]);

  const effectiveBaselineNames = useMemo(() => {
    const tabRows: Record<LiftTab, ConjugateDataPair[]> = {
      squat: squatRows,
      bench: benchRows,
      deadlift: deadliftRows,
      accessory: accessoryRows,
    };
    const result: Partial<Record<LiftTab, string>> = {};
    for (const tab of ["squat", "bench", "deadlift", "accessory"] as LiftTab[]) {
      const name = baselineNames[tab] ?? defaultBaselineName(tabRows[tab]);
      if (name) result[tab] = name;
    }
    return result;
  }, [squatRows, benchRows, deadliftRows, accessoryRows, baselineNames]);

  const stats = useLastSessionStats(pairs, effectiveBaselineNames);

  const tabs = [...MAIN_TABS, ...(accessoryRows.length > 0 ? [ACCESSORY_TAB] : [])];
  const activeTabConfig = tabs.find((t) => t.id === activeTab) ?? MAIN_TABS[0];

  const activeRows =
    activeTab === "squat"
      ? squatRows
      : activeTab === "bench"
        ? benchRows
        : activeTab === "deadlift"
          ? deadliftRows
          : accessoryRows;

  const filteredRows = useMemo(
    () =>
      activeTab === "calculator" || activeTab === "sigma"
        ? []
        : applyFilters(activeRows, {
            ...filterState[activeTab as LiftTab],
            excludeVolumeWork: activeTab !== "accessory" ? excludeVolumeWork : false,
          }),
    [activeRows, filterState, activeTab, excludeVolumeWork]
  );

  const sigmaPairs = useMemo(
    () =>
      excludeVolumeWork
        ? pairs.filter(([ex, session]) => ex.type === "accessory" || session.sets <= 1)
        : pairs,
    [pairs, excludeVolumeWork]
  );
  const sigmaStats = useLastSessionStats(sigmaPairs, effectiveBaselineNames);
  const chartStats = useLastSessionStats(filteredRows, effectiveBaselineNames);

  const effectiveShown =
    activeTab === "calculator" || activeTab === "sigma"
      ? new Set<string>()
      : shownVariations[activeTab as LiftTab];

  function toggleInSet<T>(set: Set<T>, item: T): Set<T> {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  }

  function toggleVariation(label: string) {
    const tab = activeTab as LiftTab;
    setShownVariations((prev) => {
      const current = prev[tab];
      if (current.size === 0) {
        // empty means "show all" — materialize full set minus the hidden item
        const all = new Set(activeRows.map(([ex]) => ex.displayName));
        all.delete(label);
        return { ...prev, [tab]: all };
      }
      return { ...prev, [tab]: toggleInSet(current, label) };
    });
  }

  function toggleFilter(facet: Exclude<keyof FilterState, "excludeVolumeWork">, value: string) {
    const tab = activeTab as LiftTab;
    setFilterState((prev) => {
      const current = prev[tab];
      const next = new Set(current[facet]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [tab]: { ...current, [facet]: next } };
    });
  }

  function toggleVolumeWork() {
    setExcludeVolumeWork((prev) => !prev);
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
              setShownVariations({
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
              setExcludeVolumeWork(false);
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
                { id: "sigma" as const, label: "Σ" },
                ...tabs,
                { id: "calculator" as const, label: "Calculator" },
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
            {activeTab === "calculator" ? (
              <RepCalculator pairs={pairs} baselineNames={effectiveBaselineNames} stats={stats} />
            ) : activeTab === "sigma" ? (
              <>
                <VolumeWorkToggle checked={excludeVolumeWork} onChange={toggleVolumeWork} />
                <TotalChart
                  pairs={sigmaPairs}
                  baselineNames={effectiveBaselineNames}
                  stats={sigmaStats}
                />
              </>
            ) : (
              <>
                <BaselineSelect
                  rows={activeRows}
                  selectedName={effectiveBaselineNames[activeTab] ?? null}
                  onSelect={(name) => setBaselineNames((prev) => ({ ...prev, [activeTab]: name }))}
                />
                {activeTab !== "accessory" && (
                  <VolumeWorkToggle checked={excludeVolumeWork} onChange={toggleVolumeWork} />
                )}
                <ExerciseFilters
                  rows={activeRows}
                  filters={filterState[activeTab as LiftTab]}
                  onToggle={toggleFilter}
                />
                <ConjugateCharts
                  rows={filteredRows}
                  shown={effectiveShown}
                  baselineNames={effectiveBaselineNames}
                  stats={chartStats}
                  targetName={targetNames[activeTab as LiftTab] ?? null}
                  onTargetChange={(name) =>
                    setTargetNames((prev) => ({ ...prev, [activeTab]: name }))
                  }
                />
                <ExerciseList
                  rows={activeRows}
                  shown={effectiveShown}
                  onToggle={toggleVariation}
                  stats={stats}
                  heading={activeTabConfig.heading}
                  columnHeader={activeTabConfig.columnHeader}
                  showSearch={activeTabConfig.showSearch}
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
