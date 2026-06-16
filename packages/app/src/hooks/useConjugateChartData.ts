import { useMemo } from "react";
import { formatDate, normalizeToBaseE1RM } from "@dyel/core";
import type { ConjugateExercise, RepCalcStats } from "@dyel/core";
import type { ConjugateDataPair } from "./useConjugateData";

export const NORMALIZED_KEY = "__normalized__";
export const NORMALIZED_COLOR = "#3b82f6";
export const NORMALIZED_LABEL = "Normalized e1RM";

export function useConjugateChartData(
  rows: ConjugateDataPair[],
  baselineNames: Partial<Record<string, string>>,
  stats: RepCalcStats,
  targetName: string | null
): {
  variations: string[];
  data: Record<string, string | number>[];
  showNormalized: boolean;
  bestSetByLabelAndDate: Map<string, Map<string, { sets: number; reps: number; weight: number }>>;
  baselineExercise: ConjugateExercise | null;
  effectiveTargetName: string | null;
} {
  const { addlWtOffset, variantFactor } = stats;

  const { variations, e1rmByLabelAndDate, bestSetByLabelAndDate, allDates } = useMemo(() => {
    const e1rmByLabelAndDate = new Map<string, Map<string, number>>();
    const bestSetByLabelAndDate = new Map<
      string,
      Map<string, { sets: number; reps: number; weight: number }>
    >();

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

    return { variations, e1rmByLabelAndDate, bestSetByLabelAndDate, allDates };
  }, [rows]);

  const exerciseType = rows[0]?.[0].type;
  const baselineName = exerciseType ? (baselineNames[exerciseType] ?? null) : null;

  const exerciseByName = useMemo<Map<string, ConjugateExercise>>(() => {
    const m = new Map<string, ConjugateExercise>();
    for (const [ex] of rows) if (!m.has(ex.displayName)) m.set(ex.displayName, ex);
    return m;
  }, [rows]);

  const baselineExercise = baselineName ? (exerciseByName.get(baselineName) ?? null) : null;

  const effectiveTargetName =
    targetName !== null && variations.includes(targetName) ? targetName : baselineName;
  const targetExercise = effectiveTargetName
    ? (exerciseByName.get(effectiveTargetName) ?? null)
    : null;

  const normalizedByDate = useMemo<Map<string, number>>(() => {
    if (!targetExercise) return new Map();
    const localStats = { addlWtOffset, variantFactor };
    const result = new Map<string, number>();
    for (const [exercise, session] of rows) {
      const date = session.date.toISOString().slice(0, 10);
      const normalized = normalizeToBaseE1RM(
        session.weight,
        session.reps,
        exercise,
        targetExercise,
        localStats,
        baselineExercise ?? undefined
      );
      if (normalized !== null) {
        const prev = result.get(date);
        if (prev === undefined || normalized > prev) result.set(date, Math.round(normalized));
      }
    }
    return result;
  }, [rows, targetExercise, baselineExercise, addlWtOffset, variantFactor]);

  const data = useMemo(() => {
    return allDates.map((date) => {
      const point: Record<string, string | number> = { date, label: formatDate(date) };
      for (const variation of variations) {
        const e1rm = e1rmByLabelAndDate.get(variation)?.get(date);
        if (e1rm !== undefined) point[variation] = Math.round(e1rm);
      }
      const normalized = normalizedByDate.get(date);
      if (normalized !== undefined) point[NORMALIZED_KEY] = normalized;
      return point;
    });
  }, [allDates, variations, e1rmByLabelAndDate, normalizedByDate]);

  const showNormalized = normalizedByDate.size > 0;

  return {
    variations,
    data,
    showNormalized,
    bestSetByLabelAndDate,
    baselineExercise,
    effectiveTargetName,
  };
}
