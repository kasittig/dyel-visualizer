import { useState } from "react";
import type { SheetRow } from "../hooks/useSheetData";
import { findCol } from "../hooks/useSheetData";
import { calcE1RM } from "../utils/calcE1RM";

function parseDate(str: string): Date | null {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

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
  const lastPerformed = new Map<string, Date>();
  const last1RepSet = new Map<string, { date: Date; weight: number }>();
  const lastSessionE1RM = new Map<string, number>();
  const lastSessionBestSet = new Map<string, { weight: number; reps: number }>();
  const lastSessionAllSets = new Map<string, { weight: number; reps: number }[]>();

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
    const reps = parseFloat(row["reps"] ?? "");
    if (!isNaN(weight) && !isNaN(reps) && reps > 0) {
      const roundedReps = Math.round(reps);
      const e1rm = calcE1RM(weight, reps);
      const prev = lastSessionE1RM.get(exercise);
      if (prev === undefined || e1rm > prev) {
        lastSessionE1RM.set(exercise, e1rm);
        lastSessionBestSet.set(exercise, { weight, reps: roundedReps });
      }
      const all = lastSessionAllSets.get(exercise) ?? [];
      all.push({ weight, reps: roundedReps });
      lastSessionAllSets.set(exercise, all);
    }
  }

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
            const setCount = bestSet
              ? allSets.filter((s) => s.weight === bestSet.weight && s.reps === bestSet.reps).length
              : 0;
            const setsReps = bestSet ? `${setCount}×${bestSet.reps} @ ${bestSet.weight} lbs` : null;
            const isSelected = exercise === selectedExercise;
            return (
              <tr
                key={exercise}
                onClick={() => onSelectExercise(exercise)}
                style={{ background: isSelected ? "#ede9fe" : undefined, cursor: "pointer" }}
              >
                <td style={{ ...td, fontWeight: isSelected ? 600 : undefined }}>{exercise}</td>
                <td style={td}>
                  {one ? (
                    <>
                      <span style={{ color: "#6b7280", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                        {one.date.toLocaleDateString()}
                      </span>
                      <br />
                      {one.weight} lbs
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={td}>
                  {sessionE1RM !== undefined && lastDate && setsReps ? (
                    <>
                      <span style={{ color: "#6b7280", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                        {lastDate.toLocaleDateString()} · {setsReps}
                      </span>
                      <br />
                      {Math.round(sessionE1RM)} lbs
                    </>
                  ) : (
                    "—"
                  )}
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
