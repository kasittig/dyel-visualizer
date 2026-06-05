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
import { findCol } from "../hooks/useSheetData";

function formatDate(str: string): string {
  const d = new Date(str);
  return isNaN(d.getTime())
    ? str
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

const LINE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
];

export function Charts({
  rows,
  selectedExercise,
}: {
  rows: SheetRow[];
  selectedExercise: string | null;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (!selectedExercise) {
    return (
      <section>
        <p style={{ color: "#6b7280" }}>Select an exercise to see its chart.</p>
      </section>
    );
  }

  // group: date → { repCount → maxWeight }
  const byDate = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (row["exercise"]?.trim() !== selectedExercise) continue;
    const date = row["date"]?.trim();
    if (!date) continue;
    const weight = parseFloat(findCol(row, "weight") ?? "");
    const reps = parseFloat(row["reps"] ?? "");
    if (isNaN(weight) || isNaN(reps) || reps <= 0) continue;

    const repKey = String(Math.round(reps));
    if (!byDate.has(date)) byDate.set(date, new Map());
    const dateMap = byDate.get(date)!;
    const prev = dateMap.get(repKey);
    if (prev === undefined || weight > prev) dateMap.set(repKey, weight);
  }

  if (byDate.size === 0) {
    return (
      <section>
        <h2>{selectedExercise}</h2>
        <p>No data for this exercise.</p>
      </section>
    );
  }

  // collect all rep counts, sorted numerically
  const repCounts = [...new Set([...byDate.values()].flatMap((m) => [...m.keys()]))].sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  const data = [...byDate.entries()]
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, repMap]) => {
      const point: Record<string, string | number> = { date, label: formatDate(date) };
      for (const rep of repCounts) {
        const w = repMap.get(rep);
        if (w !== undefined) point[`rep${rep}`] = w;
      }
      return point;
    });

  function toggleRep(rep: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(rep)) next.delete(rep);
      else next.add(rep);
      return next;
    });
  }

  return (
    <section>
      <h2>{selectedExercise}</h2>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        {repCounts.map((rep, i) => {
          const isHidden = hidden.has(rep);
          const color = LINE_COLORS[i % LINE_COLORS.length];
          return (
            <button
              key={rep}
              onClick={() => toggleRep(rep)}
              style={{
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                border: `2px solid ${color}`,
                background: isHidden ? "transparent" : color,
                color: isHidden ? color : "#fff",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {rep} rep{rep === "1" ? "" : "s"}
            </button>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            angle={-45}
            textAnchor="end"
            interval="preserveStartEnd"
            tick={{ fontSize: 11 }}
          />
          <YAxis tick={{ fontSize: 11 }} width={45} unit=" lbs" />
          <Tooltip
            formatter={(v, name) => [`${v} lbs`, `${String(name).replace("rep", "")} reps`]}
          />
          {repCounts.map((rep, i) => (
            <Line
              key={rep}
              type="monotone"
              dataKey={`rep${rep}`}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              hide={hidden.has(rep)}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
