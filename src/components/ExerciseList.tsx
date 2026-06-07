import { useCallback, useState } from "react";
import type { SheetRow } from "../hooks/useSheetData";
import { useLastSessionStats } from "../hooks/useLastSessionStats";
import { LastSessionCell, OneRepMaxCell } from "./ExerciseCells";
import { setsRepsLabel } from "../utils/setsRepsLabel";

export function ExerciseList({
  rows,
  selectedExercise,
  onSelectExercise,
}: {
  rows: SheetRow[];
  selectedExercise: string | null;
  onSelectExercise: (exercise: string) => void;
}) {
  const [query, setQuery] = useState("");

  const keyFn = useCallback((row: SheetRow) => row["exercise"]?.trim() || null, []);
  const { lastPerformed, last1RepSet, lastSessionE1RM, lastSessionBestSet, lastSessionAllSets } =
    useLastSessionStats(rows, keyFn);

  const entries = [...lastPerformed.entries()].sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) return <p>No exercise data found.</p>;

  const filtered = query
    ? entries.filter(([exercise]) => exercise.toLowerCase().includes(query.toLowerCase()))
    : entries;

  return (
    <section>
      <h2>Exercises</h2>
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
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={th}>Movement</th>
            <th style={th}>Last 1RM</th>
            <th style={th}>Latest e1RM</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(([exercise]) => {
            const one = last1RepSet.get(exercise);
            const sessionE1RM = lastSessionE1RM.get(exercise);
            const lastDate = lastPerformed.get(exercise);
            const bestSet = lastSessionBestSet.get(exercise);
            const allSets = lastSessionAllSets.get(exercise) ?? [];
            const setsReps = setsRepsLabel(bestSet, allSets);
            const isSelected = exercise === selectedExercise;
            return (
              <tr
                key={exercise}
                onClick={() => onSelectExercise(exercise)}
                style={{ background: isSelected ? "#ede9fe" : undefined, cursor: "pointer" }}
              >
                <td style={{ ...td, fontWeight: isSelected ? 600 : undefined }}>{exercise}</td>
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
