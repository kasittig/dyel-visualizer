import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SheetRow } from "../hooks/useSheetData";

function calcE1RM(weight: number, reps: number): number {
  return reps === 1 ? weight : weight * (1 + 0.0333 * reps);
}

function formatDate(str: string): string {
  const d = new Date(str);
  return isNaN(d.getTime()) ? str : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

export function Charts({ rows }: { rows: SheetRow[] }) {
  const exercises = [
    ...new Set(rows.map((r) => r["Exercise"]?.trim()).filter(Boolean)),
  ].sort() as string[];

  const [exercise, setExercise] = useState(exercises[0] ?? "");

  const byDate = new Map<string, { e1rm: number; volume: number }>();
  for (const row of rows) {
    if (row["Exercise"]?.trim() !== exercise) continue;
    const date = row["Date"]?.trim();
    if (!date) continue;
    const weight = parseFloat(row["Weight (lbs)"] ?? "");
    const reps = parseFloat(row["Reps"] ?? "");
    if (isNaN(weight) || isNaN(reps) || reps <= 0) continue;

    const e1rm = calcE1RM(weight, reps);
    const volume = weight * reps;
    const existing = byDate.get(date);
    byDate.set(date, {
      e1rm: existing ? Math.max(existing.e1rm, e1rm) : e1rm,
      volume: existing ? existing.volume + volume : volume,
    });
  }

  const data = [...byDate.entries()]
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, { e1rm, volume }]) => ({
      date,
      label: formatDate(date),
      e1rm: Math.round(e1rm),
      volume: Math.round(volume),
    }));

  return (
    <section>
      <h2>Charts</h2>
      <div style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="chart-exercise" style={{ marginRight: "0.5rem" }}>
          Exercise
        </label>
        <select
          id="chart-exercise"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          style={{ padding: "0.25rem 0.5rem" }}
        >
          {exercises.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>
      </div>

      {data.length === 0 ? (
        <p>No data for this exercise.</p>
      ) : (
        <>
          <h3 style={{ marginBottom: "0.5rem" }}>E1RM over time (lbs)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" angle={-45} textAnchor="end" interval="preserveStartEnd" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={45} />
              <Tooltip formatter={(v: number) => [`${v} lbs`, "E1RM"]} />
              <Line type="monotone" dataKey="e1rm" stroke="#6366f1" dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>

          <h3 style={{ margin: "1.5rem 0 0.5rem" }}>Volume over time (lbs)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" angle={-45} textAnchor="end" interval="preserveStartEnd" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={45} />
              <Tooltip formatter={(v: number) => [`${v} lbs`, "Volume"]} />
              <Line type="monotone" dataKey="volume" stroke="#10b981" dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </section>
  );
}
