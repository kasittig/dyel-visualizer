import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, normalizeToBaseE1RM } from "@dyel/core";
import type { ConjugateExercise, RepCalcStats } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";

const SQUAT_COLOR = "#e67e22";
const BENCH_COLOR = "#3498db";
const DEADLIFT_COLOR = "#2ecc71";
const TOTAL_COLOR = "#9b59b6";

type ChartPoint = Record<string, string | number>;

function buildChartData(
  pairs: ConjugateDataPair[],
  baselineExByType: Map<string, ConjugateExercise>,
  stats: RepCalcStats
): ChartPoint[] {
  const squatByDate = new Map<string, number>();
  const benchByDate = new Map<string, number>();
  const deadliftByDate = new Map<string, number>();

  for (const [exercise, session] of pairs) {
    const date = session.date.toISOString().slice(0, 10);
    let map: Map<string, number>;
    if (exercise.type === "squat") map = squatByDate;
    else if (exercise.type === "bench") map = benchByDate;
    else if (exercise.type === "deadlift") map = deadliftByDate;
    else continue;

    const baselineEx = baselineExByType.get(exercise.type);
    let e1rm: number;
    if (baselineEx) {
      const normalized = normalizeToBaseE1RM(
        session.weight,
        session.reps,
        exercise,
        baselineEx,
        stats,
        baselineEx
      );
      if (normalized === null) continue;
      e1rm = normalized;
    } else {
      e1rm = session.e1rm;
    }

    const prev = map.get(date);
    if (prev === undefined || e1rm > prev) map.set(date, e1rm);
  }

  const allDates = [
    ...new Set([...squatByDate.keys(), ...benchByDate.keys(), ...deadliftByDate.keys()]),
  ].sort();

  type Acc = { rows: ChartPoint[]; lastSquat?: number; lastBench?: number; lastDeadlift?: number };

  return allDates.reduce<Acc>(
    (acc, date) => {
      const squat = squatByDate.get(date);
      const bench = benchByDate.get(date);
      const deadlift = deadliftByDate.get(date);

      const lastSquat = squat ?? acc.lastSquat;
      const lastBench = bench ?? acc.lastBench;
      const lastDeadlift = deadlift ?? acc.lastDeadlift;

      const total =
        lastSquat !== undefined && lastBench !== undefined && lastDeadlift !== undefined
          ? Math.round(lastSquat + lastBench + lastDeadlift)
          : undefined;

      const point: ChartPoint = { date, label: formatDate(date) };
      if (squat !== undefined) point.squat = Math.round(squat);
      if (bench !== undefined) point.bench = Math.round(bench);
      if (deadlift !== undefined) point.deadlift = Math.round(deadlift);
      if (total !== undefined) point.total = total;

      return { rows: [...acc.rows, point], lastSquat, lastBench, lastDeadlift };
    },
    { rows: [] }
  ).rows;
}

export function TotalChart({
  pairs,
  baselineNames = {},
  stats,
}: {
  pairs: ConjugateDataPair[];
  baselineNames?: Partial<Record<string, string>>;
  stats: RepCalcStats;
}) {
  const unit = pairs[0]?.[1].unit ?? "lbs";

  const baselineExByType = useMemo(() => {
    const m = new Map<string, ConjugateExercise>();
    for (const [ex] of pairs) {
      if (ex.type === "accessory") continue;
      const name = baselineNames[ex.type];
      if (name && ex.displayName === name && !m.has(ex.type)) m.set(ex.type, ex);
    }
    return m;
  }, [pairs, baselineNames]);

  const data = useMemo(
    () => buildChartData(pairs, baselineExByType, stats),
    [pairs, baselineExByType, stats]
  );

  if (data.length === 0) {
    return (
      <section>
        <p style={{ color: "var(--text)" }}>No data found.</p>
      </section>
    );
  }

  return (
    <section>
      <div style={{ width: "80%", margin: "0 auto" }}>
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
            <YAxis tick={{ fontSize: 11 }} width={55} unit={` ${unit}`} />
            <Tooltip formatter={(v, name) => [`${v} ${unit}`, String(name)]} />
            <Line
              type="monotone"
              dataKey="squat"
              name="Squat"
              stroke={SQUAT_COLOR}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="bench"
              name="Bench"
              stroke={BENCH_COLOR}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="deadlift"
              name="Deadlift"
              stroke={DEADLIFT_COLOR}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="total"
              name="Est. Total"
              stroke={TOTAL_COLOR}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
