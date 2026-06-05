import { useState } from "react";
import type { SheetRow } from "../hooks/useSheetData";
import { findCol } from "../hooks/useSheetData";
import { calcE1RM } from "../utils/calcE1RM";

function parseDate(str: string): Date | null {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function ExerciseList({ rows, selectedExercise, onSelectExercise }: {
  rows: SheetRow[];
  selectedExercise: string | null;
  onSelectExercise: (exercise: string) => void;
}) {
  const [query, setQuery] = useState("");
  const lastPerformed = new Map<string, Date>();
  const last1RepSet = new Map<string, { date: Date; weight: number }>();
  const lastSessionE1RM = new Map<string, number>();

  for (const row of rows) {
    const exercise = row["exercise"]?.trim();
    const date = parseDate(row["date"]?.trim());
    if (!exercise || !date) continue;

    const existing = lastPerformed.get(exercise);
    if (!existing || date > existing) lastPerformed.set(exercise, date);

    const weight = parseFloat(findCol(row, "weight") ?? "");
    const repsStr = row["reps"]?.trim() ?? "";

    if (!isNaN(weight) && repsStr === "1") {
      const prev = last1RepSet.get(exercise);
      if (prev === undefined || date > prev.date) last1RepSet.set(exercise, { date, weight });
    }
  }

  for (const row of rows) {
    const exercise = row["exercise"]?.trim();
    const date = parseDate(row["date"]?.trim());
    if (!exercise || !date) continue;

    const lastDate = lastPerformed.get(exercise);
    if (!lastDate || date.getTime() !== lastDate.getTime()) continue;

    const weight = parseFloat(findCol(row, "weight") ?? "");
    const repsNum = parseFloat(row["reps"] ?? "");
    if (!isNaN(weight) && !isNaN(repsNum) && repsNum > 0) {
      const e1rm = calcE1RM(weight, repsNum);
      const prev = lastSessionE1RM.get(exercise);
      if (prev === undefined || e1rm > prev) lastSessionE1RM.set(exercise, e1rm);
    }
  }

  const entries = [...lastPerformed.entries()].sort(
    ([a], [b]) => a.localeCompare(b)
  );

  if (entries.length === 0) return <p>No exercise data found.</p>;

  const filtered = query
    ? entries.filter(([exercise]) =>
        exercise.toLowerCase().includes(query.toLowerCase())
      )
    : entries;

  return (
    <section>
      <h2>Exercises</h2>
      <input
        type="search"
        placeholder="Filter exercises…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", marginBottom: "0.75rem" }}
      />
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={th}>Exercise</th>
            <th style={th}>Last 1-rep set</th>
            <th style={th}>Last session E1RM</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(([exercise]) => {
            const one = last1RepSet.get(exercise);
            const sessionE1RM = lastSessionE1RM.get(exercise);
            const isSelected = exercise === selectedExercise;
            return (
              <tr
                key={exercise}
                onClick={() => onSelectExercise(exercise)}
                style={{ background: isSelected ? "#ede9fe" : undefined, cursor: "pointer" }}
              >
                <td style={{ ...td, fontWeight: isSelected ? 600 : undefined }}>{exercise}</td>
                <td style={td}>
                  {one !== undefined ? `${one.date.toLocaleDateString()} · ${one.weight} lbs` : "—"}
                </td>
                <td style={td}>
                  {sessionE1RM !== undefined ? `${Math.round(sessionE1RM)} lbs` : "—"}
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
  textAlign: "left",
  padding: "0.5rem 1rem",
  borderBottom: "2px solid #ccc",
};

const td: React.CSSProperties = {
  padding: "0.4rem 1rem",
  borderBottom: "1px solid #eee",
};
