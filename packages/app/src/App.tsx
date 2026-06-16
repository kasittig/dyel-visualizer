import { useState, useMemo, useEffect } from "react";
import type { SessionStats } from "./hooks/useLastSessionStats";
import { useConjugateData } from "./hooks/useConjugateData";
import { useLastSessionStats } from "./hooks/useLastSessionStats";
import { ConjugateCharts } from "./components/ConjugateCharts";
import { ExerciseFilters } from "./components/ExerciseFilters";
import { BaselineSelect } from "./components/BaselineSelect";
import { RepCalculator } from "./components/RepCalculator";
import { TotalChart } from "./components/TotalChart";
import { VariationRadarChart } from "./components/VariationRadarChart";
import { SigmaRadarChart } from "./components/SigmaRadarChart";
import { applyFilters, emptyFilters } from "@dyel/core";
import type { ConjugateDataPair } from "./hooks/useConjugateData";
import type { FilterState } from "@dyel/core";

function toggleInSet<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

function defaultBaselineName(rows: ConjugateDataPair[]): string | null {
  let first: string | null = null;
  const lastDate = new Map<string, Date>();
  const lastE1RM = new Map<string, number>();
  for (const [ex, session] of rows) {
    if (first === null) first = ex.displayName;
    const prev = lastDate.get(ex.displayName);
    if (!prev || session.date > prev) {
      lastDate.set(ex.displayName, session.date);
      lastE1RM.set(ex.displayName, session.e1rm);
    } else if (session.date.getTime() === prev.getTime()) {
      const prevE1RM = lastE1RM.get(ex.displayName) ?? 0;
      if (session.e1rm > prevE1RM) lastE1RM.set(ex.displayName, session.e1rm);
    }
  }

  let bestName: string | null = null;
  let bestDate: Date | null = null;
  let bestE1RM = -Infinity;
  for (const [name, date] of lastDate) {
    const e1rm = lastE1RM.get(name) ?? 0;
    if (
      !bestDate ||
      date > bestDate ||
      (date.getTime() === bestDate.getTime() && e1rm > bestE1RM)
    ) {
      bestName = name;
      bestDate = date;
      bestE1RM = e1rm;
    }
  }
  return bestName ?? first;
}

function defaultTargetName(rows: ConjugateDataPair[]): string | null {
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

const LIFT_TABS: LiftTab[] = ["squat", "bench", "deadlift", "accessory"];

const MAIN_TABS = [
  { id: "squat" as LiftTab, label: "Squat" },
  { id: "bench" as LiftTab, label: "Bench" },
  { id: "deadlift" as LiftTab, label: "Deadlift" },
];

const ACCESSORY_TAB = { id: "accessory" as LiftTab, label: "Accessories" };

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

function initialFilters(): Record<LiftTab, FilterState> {
  return Object.fromEntries(LIFT_TABS.map((t) => [t, emptyFilters()])) as Record<
    LiftTab,
    FilterState
  >;
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

function LiftTabPanel({
  filteredRows,
  effectiveBaselineNames,
  chartStats,
  targetName,
  onTargetChange,
}: {
  filteredRows: ConjugateDataPair[];
  effectiveBaselineNames: Partial<Record<LiftTab, string>>;
  chartStats: SessionStats;
  targetName: string | null;
  onTargetChange: (name: string | null) => void;
}) {
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);

  function handleVariationClick(variation: string) {
    setSelectedVariation((v) => (v === variation ? null : variation));
  }

  return (
    <>
      <ConjugateCharts
        rows={filteredRows}
        baselineNames={effectiveBaselineNames}
        stats={chartStats}
        targetName={targetName}
        onTargetChange={onTargetChange}
        highlightedVariation={selectedVariation}
        onVariationClick={handleVariationClick}
      />
      <VariationRadarChart
        rows={filteredRows}
        stats={chartStats}
        onVariationClick={handleVariationClick}
      />
    </>
  );
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const [url, setUrl] = useState(params.get("sheet") ?? import.meta.env.VITE_SHEET_URL ?? "");
  const [activeTab, setActiveTab] = useState<PageTab>("sigma");
  const [shownResetToken, setShownResetToken] = useState(0);
  const [filterState, setFilterState] = useState<Record<LiftTab, FilterState>>(initialFilters);
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

  const tabRows = useMemo<Record<LiftTab, ConjugateDataPair[]>>(
    () => ({
      squat: pairs.filter(([ex]) => ex.type === "squat"),
      bench: pairs.filter(([ex]) => ex.type === "bench"),
      deadlift: pairs.filter(([ex]) => ex.type === "deadlift"),
      accessory: pairs.filter(([ex]) => ex.type === "accessory"),
    }),
    [pairs]
  );

  const effectiveBaselineNames = useMemo(() => {
    const result: Partial<Record<LiftTab, string>> = {};
    for (const tab of LIFT_TABS) {
      const name = baselineNames[tab] ?? defaultBaselineName(tabRows[tab]);
      if (name) result[tab] = name;
    }
    return result;
  }, [tabRows, baselineNames]);

  const effectiveTargetNames = useMemo(() => {
    const result: Partial<Record<LiftTab, string>> = {};
    for (const tab of LIFT_TABS) {
      const name = targetNames[tab] ?? defaultTargetName(tabRows[tab]);
      if (name) result[tab] = name;
    }
    return result;
  }, [tabRows, targetNames]);

  const stats = useLastSessionStats(pairs, effectiveBaselineNames);

  const tabs = [...MAIN_TABS, ...(tabRows.accessory.length > 0 ? [ACCESSORY_TAB] : [])];

  const activeRows = useMemo(
    () => (activeTab === "calculator" || activeTab === "sigma" ? [] : tabRows[activeTab]),
    [activeTab, tabRows]
  );

  const calcPairs = useMemo(
    () =>
      LIFT_TABS.flatMap((tab) =>
        applyFilters(tabRows[tab], { ...filterState[tab], excludeVolumeWork })
      ),
    [tabRows, filterState, excludeVolumeWork]
  );

  const filteredRows = useMemo(
    () =>
      activeTab === "calculator" || activeTab === "sigma"
        ? []
        : calcPairs.filter(([ex]) => ex.type === activeTab),
    [calcPairs, activeTab]
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

  function handleUrlChange(newUrl: string) {
    setUrl(newUrl);
    setShownResetToken((t) => t + 1);
    setFilterState(initialFilters());
    setExcludeVolumeWork(true);
    setBaselineNames({});
  }

  function toggleFilter(facet: Exclude<keyof FilterState, "excludeVolumeWork">, value: string) {
    const tab = activeTab as LiftTab;
    setFilterState((prev) => {
      const current = prev[tab];
      return { ...prev, [tab]: { ...current, [facet]: toggleInSet(current[facet], value) } };
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
            onChange={(e) => handleUrlChange(e.target.value)}
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
              <>
                <VolumeWorkToggle checked={excludeVolumeWork} onChange={toggleVolumeWork} />
                <RepCalculator
                  pairs={calcPairs}
                  baselineNames={effectiveBaselineNames}
                  stats={stats}
                />
              </>
            ) : activeTab === "sigma" ? (
              <>
                <VolumeWorkToggle checked={excludeVolumeWork} onChange={toggleVolumeWork} />
                <TotalChart
                  pairs={sigmaPairs}
                  baselineNames={effectiveBaselineNames}
                  targetNames={effectiveTargetNames}
                  stats={sigmaStats}
                />
                <SigmaRadarChart
                  pairs={sigmaPairs}
                  baselineNames={effectiveBaselineNames}
                  targetNames={effectiveTargetNames}
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
                <LiftTabPanel
                  key={shownResetToken}
                  filteredRows={filteredRows}
                  effectiveBaselineNames={effectiveBaselineNames}
                  chartStats={chartStats}
                  targetName={effectiveTargetNames[activeTab as LiftTab] ?? null}
                  onTargetChange={(name) =>
                    setTargetNames((prev) => ({ ...prev, [activeTab]: name }))
                  }
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
