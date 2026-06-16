import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { RepCalcStats } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";
import { buildChartData } from "../utils/buildChartData";

export function SigmaRadarChart({
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

  const data = useMemo(() => {
    const baselineExByType = new Map(
      pairs
        .filter(([ex]) => ex.type !== "accessory" && ex.displayName === baselineNames[ex.type])
        .map(([ex]) => [ex.type, ex] as const)
    );
    const targetExByType = new Map(
      pairs
        .filter(([ex]) => ex.type !== "accessory" && ex.displayName === targetNames[ex.type])
        .map(([ex]) => [ex.type, ex] as const)
    );

    const chartData = buildChartData(pairs, baselineExByType, targetExByType, stats);
    if (chartData.length === 0) return null;

    let lastSquat: number | undefined;
    let lastBench: number | undefined;
    let lastDeadlift: number | undefined;
    for (const point of chartData) {
      if (point.squat !== undefined) lastSquat = point.squat as number;
      if (point.bench !== undefined) lastBench = point.bench as number;
      if (point.deadlift !== undefined) lastDeadlift = point.deadlift as number;
    }

    const points = [
      lastSquat !== undefined ? { lift: "Squat", e1rm: lastSquat } : null,
      lastBench !== undefined ? { lift: "Bench", e1rm: lastBench } : null,
      lastDeadlift !== undefined ? { lift: "Deadlift", e1rm: lastDeadlift } : null,
    ].filter((p): p is { lift: string; e1rm: number } => p !== null);

    return points.length === 3 ? points : null;
  }, [pairs, baselineNames, targetNames, stats]);

  if (!data) return null;

  return (
    <section style={{ marginTop: "1rem" }}>
      <p
        style={{
          fontSize: "0.8rem",
          color: "var(--text)",
          marginBottom: "0.25rem",
          textAlign: "center",
        }}
      >
        Current e1RM by lift (normalized)
      </p>
      <div style={{ width: "80%", margin: "0 auto" }}>
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="lift" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fontSize: 10 }} unit={` ${unit}`} />
            <Radar dataKey="e1rm" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
            <Tooltip formatter={(v) => [`${v} ${unit}`, "e1RM"]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
