import { useCallback } from "react";
import type { SheetRow } from "../hooks/useSheetData";
import type { ConjugateLift } from "../types/conjugate";
import { conjugateLiftLabel, parseConjugateLift } from "../utils/parseConjugate";
import { useLastSessionStats } from "../hooks/useLastSessionStats";
import { LastSessionCell, OneRepMaxCell } from "./ExerciseCells";
import { setsRepsLabel } from "../utils/setsRepsLabel";
import type { AttrFilter } from "../utils/conjugateFilter";
import { meetsFilter } from "../utils/conjugateFilter";

export function ConjugateExerciseList({
  rows,
  liftType,
  hidden,
  attributeFilter,
  onToggle,
}: {
  rows: SheetRow[];
  liftType: ConjugateLift["liftType"];
  hidden: Set<string>;
  attributeFilter: Map<string, AttrFilter>;
  onToggle: (label: string) => void;
}) {
  const keyFn = useCallback(
    (row: SheetRow) => {
      const parsed = parseConjugateLift(row["exercise"]?.trim() ?? "");
      if (!parsed || parsed.liftType !== liftType) return null;
      if (!meetsFilter(parsed, attributeFilter)) return null;
      return conjugateLiftLabel(parsed);
    },
    [liftType, attributeFilter]
  );

  const { lastPerformed, last1RepSet, lastSessionE1RM, lastSessionBestSet, lastSessionAllSets } =
    useLastSessionStats(rows, keyFn);

  const allVariations = [...lastPerformed.keys()].sort();
  if (allVariations.length === 0) return <p>No {liftType} data found.</p>;

  const visible = allVariations.filter((v) => !hidden.has(v));
  const minimized = allVariations.filter((v) => hidden.has(v));
  const variations = [...visible, ...minimized];

  return (
    <section>
      <h2>Variations</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={th}>Variation</th>
            <th style={th}>Last 1RM</th>
            <th style={th}>Latest e1RM</th>
          </tr>
        </thead>
        <tbody>
          {variations.map((label) => {
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
                  <td colSpan={3} style={{ ...td, color: "#9ca3af", fontSize: "0.85rem" }}>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

const th: React.CSSProperties = {
  textAlign: "center",
  padding: "0.5rem 1rem",
  borderBottom: "2px solid #ccc",
};

const td: React.CSSProperties = {
  padding: "0.4rem 1rem",
  borderBottom: "1px solid #eee",
};
