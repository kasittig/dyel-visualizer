import type { ConjugateDataPair, ConjugateExercise } from '../../types/conjugate';
import type { RepCalcStats } from '../math/repCalculator';
import { normalizeToBaseE1RM } from '../math/repCalculator';
import type { ChartPoint } from './buildChartData';
import { isoDate, recordMax, sortedGridDates, type DateValueGrid } from './chartGrid';

export const NORMALIZED_KEY = '__normalized__';

interface BestSet {
  sets: number;
  reps: number;
  weight: number;
  rpe: number | null;
}

export interface VariationChartResult {
  variations: string[];
  data: ChartPoint[];
  showNormalized: boolean;
  bestSetByLabelAndDate: Map<string, Map<string, BestSet>>;
  baselineExercise: ConjugateExercise | null;
  effectiveTargetName: string | null;
}

export function buildVariationChartData(
  rows: ConjugateDataPair[],
  baselineNames: Partial<Record<string, string>>,
  stats: RepCalcStats,
  targetName: string | null
): VariationChartResult {
  const e1rmByLabelAndDate: DateValueGrid = new Map();
  const bestSetByLabelAndDate = new Map<string, Map<string, BestSet>>();
  const exerciseByName = new Map<string, ConjugateExercise>();

  for (const [exercise, session] of rows) {
    const label = exercise.displayName;
    const date = isoDate(session.date);
    if (!exerciseByName.has(label)) {
      bestSetByLabelAndDate.set(label, new Map());
      exerciseByName.set(label, exercise);
    }
    if (recordMax(e1rmByLabelAndDate, label, date, session.e1rm)) {
      bestSetByLabelAndDate.get(label)!.set(date, {
        sets: session.sets,
        reps: session.reps,
        weight: session.weight,
        rpe: session.rpe,
      });
    }
  }

  const variations = [...e1rmByLabelAndDate.keys()].sort();
  const allDates = sortedGridDates(e1rmByLabelAndDate);

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
      const date = isoDate(session.date);
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
        if (prev === undefined || normalized > prev) {
          normalizedByDate.set(date, Math.round(normalized));
        }
      }
    }
  }

  const data: ChartPoint[] = allDates.map((date) => {
    const point: ChartPoint = { date };
    for (const variation of variations) {
      const e1rm = e1rmByLabelAndDate.get(variation)?.get(date);
      if (e1rm !== undefined) {
        point[variation] = Math.round(e1rm);
      }
    }
    const normalized = normalizedByDate.get(date);
    if (normalized !== undefined) {
      point[NORMALIZED_KEY] = normalized;
    }
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
