import { normalizeToBaseE1RM } from "@dyel/core";
import type { ConjugateExercise, RepCalcStats } from "@dyel/core";
import { formatDate } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";

export type ChartPoint = Record<string, string | number>;

export function buildChartData(
  pairs: ConjugateDataPair[],
  baselineExByType: Map<string, ConjugateExercise>,
  targetExByType: Map<string, ConjugateExercise>,
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
    const targetEx = targetExByType.get(exercise.type) ?? baselineEx;
    let e1rm: number;
    if (targetEx) {
      const normalized = normalizeToBaseE1RM(
        session.weight,
        session.reps,
        exercise,
        targetEx,
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
