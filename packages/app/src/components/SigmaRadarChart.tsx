import { useMemo } from "react";
import type { RepCalcStats } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";
import { useBaselineTargetExercises } from "../hooks/useBaselineTargetExercises";
import { buildChartData } from "../utils/buildChartData";
import { BaseRadarChart } from "./BaseRadarChart";

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
  const { baselineExByType, targetExByType } = useBaselineTargetExercises(
    pairs,
    baselineNames,
    targetNames
  );

  const data = useMemo(() => {
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
  }, [pairs, baselineExByType, targetExByType, stats]);

  if (!data) return null;

  return (
    <BaseRadarChart
      label="Current e1RM by lift (normalized)"
      data={data}
      angleKey="lift"
      unit={unit}
      tooltip={{ formatter: (v) => [`${v} ${unit}`, "e1RM"] }}
    />
  );
}
