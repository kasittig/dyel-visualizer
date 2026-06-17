import type { ConjugateDataPair, ConjugateExercise } from "../types/conjugate";
import { formatDate } from "./chartUtils";
import type { RepCalcStats } from "./repCalculator";
import { normalizeToBaseE1RM } from "./repCalculator";
import type { ChartPoint } from "./buildChartData";

export const NORMALIZED_KEY = "__normalized__";

type BestSet = { sets: number; reps: number; weight: number };

export type VariationChartResult = {
  variations: string[];
  data: ChartPoint[];
  showNormalized: boolean;
  bestSetByLabelAndDate: Map<string, Map<string, BestSet>>;
  baselineExercise: ConjugateExercise | null;
  effectiveTargetName: string | null;
};

export function buildVariationChartData(
  rows: ConjugateDataPair[],
  baselineNames: Partial<Record<string, string>>,
  stats: RepCalcStats,
  targetName: string | null
): VariationChartResult {
  const e1rmByLabelAndDate = new Map<string, Map<string, number>>();
  const bestSetByLabelAndDate = new Map<string, Map<string, BestSet>>();

  for (const [exercise, session] of rows) {
    const label = exercise.displayName;
    const date = session.date.toISOString().slice(0, 10);
    if (!e1rmByLabelAndDate.has(label)) {
      e1rmByLabelAndDate.set(label, new Map());
      bestSetByLabelAndDate.set(label, new Map());
    }
    const byDate = e1rmByLabelAndDate.get(label)!;
    const prev = byDate.get(date);
    if (prev === undefined || session.e1rm > prev) {
      byDate.set(date, session.e1rm);
      bestSetByLabelAndDate.get(label)!.set(date, {
        sets: session.sets,
        reps: session.reps,
        weight: session.weight,
      });
    }
  }

  const variations = [...e1rmByLabelAndDate.keys()].sort();
  const allDates = [
    ...new Set([...e1rmByLabelAndDate.values()].flatMap((m) => [...m.keys()])),
  ].sort();

  const exerciseByName = new Map<string, ConjugateExercise>();
  for (const [ex] of rows)
    if (!exerciseByName.has(ex.displayName)) exerciseByName.set(ex.displayName, ex);

  const exerciseType = rows[0]?.[0].type;
  const baselineName = exerciseType ? (baselineNames[exerciseType] ?? null) : null;
  const baselineExercise = baselineName ? (exerciseByName.get(baselineName) ?? null) : null;

  const effectiveTargetName =
    targetName !== null && variations.includes(targetName) ? targetName : baselineName;
  const targetExercise = effectiveTargetName
    ? (exerciseByName.get(effectiveTargetName) ?? null)
    : null;

  const normalizedByDate = new Map<string, number>();
  if (targetExercise) {
    for (const [exercise, session] of rows) {
      const date = session.date.toISOString().slice(0, 10);
      const normalized = normalizeToBaseE1RM(
        session.weight,
        session.reps,
        exercise,
        targetExercise,
        stats,
        baselineExercise ?? undefined
      );
      if (normalized !== null) {
        const prev = normalizedByDate.get(date);
        if (prev === undefined || normalized > prev)
          normalizedByDate.set(date, Math.round(normalized));
      }
    }
  }

  const data: ChartPoint[] = allDates.map((date) => {
    const point: ChartPoint = { date, label: formatDate(date) };
    for (const variation of variations) {
      const e1rm = e1rmByLabelAndDate.get(variation)?.get(date);
      if (e1rm !== undefined) point[variation] = Math.round(e1rm);
    }
    const normalized = normalizedByDate.get(date);
    if (normalized !== undefined) point[NORMALIZED_KEY] = normalized;
    return point;
  });

  return {
    variations,
    data,
    showNormalized: normalizedByDate.size > 0,
    bestSetByLabelAndDate,
    baselineExercise,
    effectiveTargetName,
  };
}
