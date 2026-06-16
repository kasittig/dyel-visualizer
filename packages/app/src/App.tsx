import { useState, useMemo, useEffect } from "react";
import { useConjugateData } from "./hooks/useConjugateData";
import { useLastSessionStats } from "./hooks/useLastSessionStats";
import { ExerciseFilters } from "./components/ExerciseFilters";
import { BaselineSelect } from "./components/BaselineSelect";
import { RepCalculator } from "./components/RepCalculator";
import { TotalChart } from "./components/TotalChart";
import { SigmaRadarChart } from "./components/SigmaRadarChart";
import { LiftTabPanel } from "./components/LiftTabPanel";
import { VolumeWorkToggle } from "./components/VolumeWorkToggle";
import { applyFilters } from "@dyel/core";
import type { ConjugateDataPair } from "./hooks/useConjugateData";
import type { FilterState } from "@dyel/core";
import {
  extractSheetRef,
  defaultBaselineName,
  defaultTargetName,
  initialTabState,
  toggleInSet,
  LIFT_TABS,
  MAIN_TABS,
  ACCESSORY_TAB,
  EXAMPLE_SHEET_URL,
  EXAMPLE_VISUALIZER_URL,
} from "./utils/appUtils";
import type { LiftType, PageTab, TabState } from "./utils/appUtils";

function App() {
  const params = new URLSearchParams(window.location.search);
  const [url, setUrl] = useState(params.get("sheet") ?? import.meta.env.VITE_SHEET_URL ?? "");
  const [activeTab, setActiveTab] = useState<PageTab>("sigma");
  const [shownResetToken, setShownResetToken] = useState(0);
  const [tabState, setTabState] = useState<Record<LiftType, TabState>>(initialTabState);
  const [excludeVolumeWork, setExcludeVolumeWork] = useState(true);

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

  const tabRows = useMemo<Record<LiftType, ConjugateDataPair[]>>(
    () => ({
      squat: pairs.filter(([ex]) => ex.type === "squat"),
      bench: pairs.filter(([ex]) => ex.type === "bench"),
      deadlift: pairs.filter(([ex]) => ex.type === "deadlift"),
      accessory: pairs.filter(([ex]) => ex.type === "accessory"),
    }),
    [pairs]
  );

  const { effectiveBaselineNames, effectiveTargetNames } = useMemo(() => {
    const baseline: Partial<Record<LiftType, string>> = {};
    const target: Partial<Record<LiftType, string>> = {};
    for (const tab of LIFT_TABS) {
      const b = tabState[tab].baselineName ?? defaultBaselineName(tabRows[tab]);
      if (b) baseline[tab] = b;
      const t = tabState[tab].targetName ?? defaultTargetName(tabRows[tab]);
      if (t) target[tab] = t;
    }
    return { effectiveBaselineNames: baseline, effectiveTargetNames: target };
  }, [tabRows, tabState]);

  const stats = useLastSessionStats(pairs, effectiveBaselineNames);

  const tabs = [...MAIN_TABS, ...(tabRows.accessory.length > 0 ? [ACCESSORY_TAB] : [])];

  const liftTab: LiftType | null =
    activeTab !== "calculator" && activeTab !== "sigma" ? activeTab : null;

  const activeRows = useMemo(() => (liftTab ? tabRows[liftTab] : []), [liftTab, tabRows]);

  const calcPairs = useMemo(
    () =>
      LIFT_TABS.flatMap((tab) =>
        applyFilters(tabRows[tab], { ...tabState[tab].filters, excludeVolumeWork })
      ),
    [tabRows, tabState, excludeVolumeWork]
  );

  const filteredRows = useMemo(
    () => (liftTab ? calcPairs.filter(([ex]) => ex.type === liftTab) : []),
    [calcPairs, liftTab]
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
    setTabState(initialTabState());
    setExcludeVolumeWork(true);
  }

  function toggleFilter(facet: Exclude<keyof FilterState, "excludeVolumeWork">, value: string) {
    if (!liftTab) return;
    setTabState((prev) => ({
      ...prev,
      [liftTab]: {
        ...prev[liftTab],
        filters: {
          ...prev[liftTab].filters,
          [facet]: toggleInSet(prev[liftTab].filters[facet], value),
        },
      },
    }));
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
            ) : liftTab !== null ? (
              <>
                <BaselineSelect
                  rows={activeRows}
                  selectedName={effectiveBaselineNames[liftTab] ?? null}
                  onSelect={(name) =>
                    setTabState((prev) => ({
                      ...prev,
                      [liftTab]: { ...prev[liftTab], baselineName: name ?? undefined },
                    }))
                  }
                />
                {liftTab !== "accessory" && (
                  <VolumeWorkToggle checked={excludeVolumeWork} onChange={toggleVolumeWork} />
                )}
                <ExerciseFilters
                  rows={activeRows}
                  filters={tabState[liftTab].filters}
                  onToggle={toggleFilter}
                />
                <LiftTabPanel
                  key={shownResetToken}
                  filteredRows={filteredRows}
                  effectiveBaselineNames={effectiveBaselineNames}
                  chartStats={chartStats}
                  targetName={effectiveTargetNames[liftTab] ?? null}
                  onTargetChange={(name) =>
                    setTabState((prev) => ({
                      ...prev,
                      [liftTab]: { ...prev[liftTab], targetName: name ?? undefined },
                    }))
                  }
                />
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

export default App;
