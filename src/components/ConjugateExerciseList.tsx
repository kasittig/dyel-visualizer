import { useCallback, useMemo } from "react";
import type { SheetRow } from "../hooks/useSheetData";
import type { ConjugateLift } from "../types/conjugate";
import type { ParsedConjugateRow } from "../utils/parseConjugate";
import { useLastSessionStats } from "../hooks/useLastSessionStats";
import { LastSessionCell, OneRepMaxCell } from "./ExerciseCells";
import { setsRepsLabel } from "../utils/setsRepsLabel";
import { th, td } from "../utils/tableStyles";

export function ConjugateExerciseList({
  rows,
  liftType,
  hidden,
  onToggle,
}: {
  rows: ParsedConjugateRow[];
  liftType: ConjugateLift["liftType"];
  hidden: Set<string>;
  onToggle: (label: string) => void;
}) {
  const sheetRows = useMemo(() => rows.map((p) => p.row), [rows]);
  const rowLabelMap = useMemo(
    () => new Map(rows.map((p) => [p.row, p.lift?.liftType === liftType ? p.label : null])),
    [rows, liftType]
  );
  const keyFn = useCallback((row: SheetRow) => rowLabelMap.get(row) ?? null, [rowLabelMap]);

  const { lastPerformed, last1RepSet, lastSessionE1RM, lastSessionBestSet, lastSessionAllSets } =
    useLastSessionStats(sheetRows, keyFn);

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
