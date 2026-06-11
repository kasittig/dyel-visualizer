import { useState } from "react";
import type { ConjugateDataPair } from "../hooks/useConjugateData";
import { useLastSessionStats } from "../hooks/useLastSessionStats";
import {
  AddlWtOffsetCell,
  LastSessionCell,
  OneRepMaxCell,
  PredictedE1RMCell,
  VariantFactorCell,
} from "./ExerciseCells";
import { setsRepsLabel } from "../utils/setsRepsLabel";
import { th, td } from "../utils/tableStyles";

export function ExerciseList({
  rows,
  hidden,
  onToggle,
  heading = "Exercises",
  columnHeader = "Movement",
  showSearch = false,
}: {
  rows: ConjugateDataPair[];
  hidden: Set<string>;
  onToggle: (label: string) => void;
  heading?: string;
  columnHeader?: string;
  showSearch?: boolean;
}) {
  const [query, setQuery] = useState("");

  const {
    lastPerformed,
    last1RepSet,
    lastSessionE1RM,
    lastSessionBestSet,
    lastSessionAllSets,
    predictedE1RM,
    addlWtOffset,
    variantFactor,
  } = useLastSessionStats(rows);

  const hasAddlWtExercises = addlWtOffset.size > 0;
  const hasVariantExercises = variantFactor.size > 0;

  const allLabels = [...lastPerformed.keys()].sort();
  if (allLabels.length === 0) return <p>No data found.</p>;

  const visible = allLabels.filter((l) => !hidden.has(l));
  const minimized = allLabels.filter((l) => hidden.has(l));
  const labels = [...visible, ...minimized];

  const displayed =
    showSearch && query
      ? visible.filter((l) => l.toLowerCase().includes(query.toLowerCase()))
      : labels;

  return (
    <section>
      <h2>{heading}</h2>
      {showSearch && (
        <input
          type="search"
          placeholder={`Filter ${heading.toLowerCase()}…`}
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
            {hasAddlWtExercises && <th style={th}>Resistance Offset</th>}
            {hasVariantExercises && <th style={th}>Variant Factor</th>}
          </tr>
        </thead>
        <tbody>
          {displayed.map((label) => {
            const one = last1RepSet.get(label);
            const sessionE1RM = lastSessionE1RM.get(label);
            const lastDate = lastPerformed.get(label);
            const bestSet = lastSessionBestSet.get(label);
            const allSets = lastSessionAllSets.get(label) ?? [];
            const setsReps = setsRepsLabel(bestSet, allSets);
            const isHidden = hidden.has(label);
            if (isHidden) {
              return (
                <tr key={label} onClick={() => onToggle(label)} style={{ cursor: "pointer" }}>
                  <td
                    colSpan={4 + (hasAddlWtExercises ? 1 : 0) + (hasVariantExercises ? 1 : 0)}
                    style={{ ...td, color: "var(--text)", fontSize: "0.85rem" }}
                  >
                    {label}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={label} onClick={() => onToggle(label)} style={{ cursor: "pointer" }}>
                <td style={td}>{label}</td>
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
                  <PredictedE1RMCell predicted={predictedE1RM.get(label)} />
                </td>
                {hasAddlWtExercises && (
                  <td style={td}>
                    <AddlWtOffsetCell addlWtOffset={addlWtOffset.get(label)} />
                  </td>
                )}
                {hasVariantExercises && (
                  <td style={td}>
                    <VariantFactorCell variantFactor={variantFactor.get(label)} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
