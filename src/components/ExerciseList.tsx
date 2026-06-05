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
  const bestE1RM = new Map<string, { value: number; date: Date }>();

  for (const row of rows) {
    const exercise = row["exercise"]?.trim();
    const date = parseDate(row["date"]?.trim());
    if (!exercise || !date) continue;

    const existing = lastPerformed.get(exercise);
    if (!existing || date > existing) lastPerformed.set(exercise, date);

    const weight = parseFloat(findCol(row, "weight") ?? "");
    const reps = parseFloat(row["reps"] ?? "");
    if (!isNaN(weight) && !isNaN(reps) && reps > 0) {
      const e1rm = calcE1RM(weight, reps);
      const best = bestE1RM.get(exercise);
      if (best === undefined || e1rm > best.value) bestE1RM.set(exercise, { value: e1rm, date });
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
            <th style={th}>Last Performed</th>
            <th style={{ ...th, textAlign: "right" }}>Best E1RM (lbs)</th>
            <th style={th}>E1RM Date</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(([exercise, date]) => {
            const best = bestE1RM.get(exercise);
            const isSelected = exercise === selectedExercise;
            return (
              <tr
                key={exercise}
                onClick={() => onSelectExercise(exercise)}
                style={{ background: isSelected ? "#ede9fe" : undefined, cursor: "pointer" }}
              >
                <td style={{ ...td, fontWeight: isSelected ? 600 : undefined }}>{exercise}</td>
                <td style={td}>{date.toLocaleDateString()}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  {best !== undefined ? Math.round(best.value) : "—"}
                </td>
                <td style={td}>{best !== undefined ? best.date.toLocaleDateString() : "—"}</td>
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
