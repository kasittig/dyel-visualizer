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
import type { ConjugateExercise, RepCalcStats } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";
import { buildChartData } from "../utils/buildChartData";

const SQUAT_COLOR = "#e67e22";
const BENCH_COLOR = "#3498db";
const DEADLIFT_COLOR = "#2ecc71";
const TOTAL_COLOR = "#9b59b6";

export function TotalChart({
  pairs,
  baselineNames = {},
  targetNames = {},
  stats,
}: {
  pairs: ConjugateDataPair[];
  baselineNames?: Partial<Record<string, string>>;
  targetNames?: Partial<Record<string, string>>;
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

  const targetExByType = useMemo(() => {
    const m = new Map<string, ConjugateExercise>();
    for (const [ex] of pairs) {
      if (ex.type === "accessory") continue;
      const name = targetNames[ex.type];
      if (name && ex.displayName === name && !m.has(ex.type)) m.set(ex.type, ex);
    }
    return m;
  }, [pairs, targetNames]);

  const data = useMemo(
    () => buildChartData(pairs, baselineExByType, targetExByType, stats),
    [pairs, baselineExByType, targetExByType, stats]
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
