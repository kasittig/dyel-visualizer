import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SheetRow } from "../hooks/useSheetData";
import { findCol } from "../hooks/useSheetData";
import { calcE1RM } from "../utils/e1rm";
import { calcVolume } from "../utils/calcVolume";
import { formatDate, LINE_COLORS } from "../utils/chartUtils";

const E1RM_COLOR = "#dc2626";
const VOLUME_COLOR = "#0369a1";

// Keys that are not rep-count series
const METRIC_KEYS = new Set(["e1rm", "volume"]);

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
  // also accumulate best e1RM and total volume per date
  const byDate = new Map<string, Map<string, number>>();
  const e1rmByDate = new Map<string, number>();
  const volumeByDate = new Map<string, number>();

  for (const row of rows) {
    if (row["exercise"]?.trim() !== selectedExercise) continue;
    const date = row["date"]?.trim();
    if (!date) continue;
    const weight = parseFloat(findCol(row, "weight") ?? "");
    const reps = parseFloat(row["reps"] ?? "");
    if (isNaN(weight) || isNaN(reps) || reps <= 0) continue;

    // Per-rep-count max weight
    const repKey = String(Math.round(reps));
    if (!byDate.has(date)) byDate.set(date, new Map());
    const dateMap = byDate.get(date)!;
    const prev = dateMap.get(repKey);
    if (prev === undefined || weight > prev) dateMap.set(repKey, weight);

    // Best e1RM for the session
    const e1rm = calcE1RM(weight, reps);
    const prevE1rm = e1rmByDate.get(date);
    if (prevE1rm === undefined || e1rm > prevE1rm) e1rmByDate.set(date, e1rm);

    // Total volume for the session
    volumeByDate.set(date, (volumeByDate.get(date) ?? 0) + calcVolume(weight, reps));
  }

  if (byDate.size === 0 && e1rmByDate.size === 0) {
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

  // All dates that have any data (union of rep-count and metric dates)
  const allDates = [
    ...new Set([...byDate.keys(), ...e1rmByDate.keys(), ...volumeByDate.keys()]),
  ].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const data = allDates.map((date) => {
    const repMap = byDate.get(date);
    const point: Record<string, string | number> = { date, label: formatDate(date) };
    if (repMap) {
      for (const rep of repCounts) {
        const w = repMap.get(rep);
        if (w !== undefined) point[`rep${rep}`] = w;
      }
    }
    const e1rm = e1rmByDate.get(date);
    if (e1rm !== undefined) point["e1rm"] = Math.round(e1rm);
    const vol = volumeByDate.get(date);
    if (vol !== undefined) point["volume"] = Math.round(vol);
    return point;
  });

  function toggleKey(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section>
      <h2>{selectedExercise}</h2>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        {repCounts.map((rep, i) => {
          const isHidden = hidden.has(`rep${rep}`);
          const color = LINE_COLORS[i % LINE_COLORS.length];
          return (
            <button
              key={rep}
              onClick={() => toggleKey(`rep${rep}`)}
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
        <button
          onClick={() => toggleKey("e1rm")}
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: "9999px",
            border: `2px solid ${E1RM_COLOR}`,
            background: hidden.has("e1rm") ? "transparent" : E1RM_COLOR,
            color: hidden.has("e1rm") ? E1RM_COLOR : "#fff",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          e1RM
        </button>
        <button
          onClick={() => toggleKey("volume")}
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: "9999px",
            border: `2px solid ${VOLUME_COLOR}`,
            background: hidden.has("volume") ? "transparent" : VOLUME_COLOR,
            color: hidden.has("volume") ? VOLUME_COLOR : "#fff",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          Session Volume
        </button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 4, right: 50, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            angle={-45}
            textAnchor="end"
            interval="preserveStartEnd"
            tick={{ fontSize: 11 }}
          />
          <YAxis yAxisId="weight" tick={{ fontSize: 11 }} width={45} unit=" lbs" />
          <YAxis
            yAxisId="volume"
            orientation="right"
            tick={{ fontSize: 11 }}
            width={55}
            unit=" lbs"
          />
          <Tooltip
            formatter={(v, name) => {
              const key = String(name);
              if (key === "e1rm") return [`${v} lbs`, "e1RM"];
              if (key === "volume") return [`${v} lbs`, "Volume"];
              return [`${v} lbs`, `${key.replace("rep", "")} reps`];
            }}
          />
          <Legend
            formatter={(value) => {
              if (METRIC_KEYS.has(value)) return value === "e1rm" ? "e1RM" : "Volume";
              return `${value.replace("rep", "")} reps`;
            }}
            wrapperStyle={{ fontSize: "0.8rem", paddingTop: "0.5rem" }}
          />
          {repCounts.map((rep, i) => (
            <Line
              key={rep}
              yAxisId="weight"
              type="monotone"
              dataKey={`rep${rep}`}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              hide={hidden.has(`rep${rep}`)}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="e1rm"
            stroke={E1RM_COLOR}
            strokeDasharray="6 3"
            hide={hidden.has("e1rm")}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
          <Line
            yAxisId="volume"
            type="monotone"
            dataKey="volume"
            stroke={VOLUME_COLOR}
            strokeDasharray="4 2"
            hide={hidden.has("volume")}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
