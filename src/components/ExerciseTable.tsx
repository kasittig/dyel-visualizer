import { useMemo, useState } from "react";
import type { SheetRow } from "../hooks/useSheetData";
import { useLastSessionStats } from "../hooks/useLastSessionStats";
import { LastSessionCell, OneRepMaxCell, PredictedE1RMCell } from "./ExerciseCells";
import { setsRepsLabel } from "../utils/setsRepsLabel";
import { th, td } from "../utils/tableStyles";

type SelectMode = {
  type: "select";
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

type ToggleMode = {
  type: "toggle";
  hidden: Set<string>;
  onToggle: (key: string) => void;
};

export function ExerciseTable({
  sheetRows,
  keyFn,
  heading,
  emptyMessage,
  mode,
}: {
  sheetRows: SheetRow[];
  keyFn: (row: SheetRow) => string | null;
  heading: string;
  emptyMessage: string;
  mode: SelectMode | ToggleMode;
}) {
  const [query, setQuery] = useState("");

  const {
    lastPerformed,
    last1RepSet,
    lastSessionE1RM,
    lastSessionBestSet,
    lastSessionAllSets,
    predictedE1RM,
  } = useLastSessionStats(sheetRows, keyFn);

  const allKeys = useMemo(() => [...lastPerformed.keys()].sort(), [lastPerformed]);

  if (allKeys.length === 0) return <p>{emptyMessage}</p>;

  const keys =
    mode.type === "toggle"
      ? [
          ...allKeys.filter((k) => !mode.hidden.has(k)),
          ...allKeys.filter((k) => mode.hidden.has(k)),
        ]
      : query
        ? allKeys.filter((k) => k.toLowerCase().includes(query.toLowerCase()))
        : allKeys;

  const columnHeader = mode.type === "toggle" ? "Variation" : "Movement";

  return (
    <section>
      <h2>{heading}</h2>
      {mode.type === "select" && (
        <input
          type="search"
          placeholder="Filter exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            boxSizing: "border-box",
            marginBottom: "0.75rem",
          }}
        />
      )}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={th}>{columnHeader}</th>
            <th style={th}>Last 1RM</th>
            <th style={th}>Latest Session</th>
            <th style={th}>Predicted e1RM</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const one = last1RepSet.get(key);
            const sessionE1RM = lastSessionE1RM.get(key);
            const lastDate = lastPerformed.get(key);
            const bestSet = lastSessionBestSet.get(key);
            const allSets = lastSessionAllSets.get(key) ?? [];
            const setsReps = setsRepsLabel(bestSet, allSets);

            if (mode.type === "toggle" && mode.hidden.has(key)) {
              return (
                <tr key={key} onClick={() => mode.onToggle(key)} style={{ cursor: "pointer" }}>
                  <td colSpan={4} style={{ ...td, color: "#9ca3af", fontSize: "0.85rem" }}>
                    {key}
                  </td>
                </tr>
              );
            }

            const isSelected = mode.type === "select" && key === mode.selectedKey;
            return (
              <tr
                key={key}
                onClick={() => (mode.type === "select" ? mode.onSelect(key) : mode.onToggle(key))}
                style={{ background: isSelected ? "#ede9fe" : undefined, cursor: "pointer" }}
              >
                <td style={{ ...td, fontWeight: isSelected ? 600 : undefined }}>{key}</td>
                <td style={td}>
                  <OneRepMaxCell one={one} />
                </td>
                <td style={td}>
                  <LastSessionCell
                    sessionE1RM={sessionE1RM}
                    lastDate={lastDate}
                    setsReps={setsReps}
                  />
                </td>
                <td style={td}>
                  <PredictedE1RMCell predicted={predictedE1RM.get(key)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
