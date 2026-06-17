import type { ConjugateDataPair, ConjugateExercise, PrimaryLift } from "../types/conjugate";
import type { RepCalcStats } from "./repCalculator";
import { normalizeToBaseE1RM } from "./repCalculator";

export type ChartPoint = Record<string, string | number>;

const LIFT_TYPES: PrimaryLift[] = ["squat", "bench", "deadlift"];

export function buildChartData(
  pairs: ConjugateDataPair[],
  baselineExByType: Map<string, ConjugateExercise>,
  targetExByType: Map<string, ConjugateExercise>,
  stats: RepCalcStats
): ChartPoint[] {
  const byDate = new Map<PrimaryLift, Map<string, number>>(
    LIFT_TYPES.map((lift) => [lift, new Map()])
  );
  const allDatesSet = new Set<string>();

  for (const [exercise, session] of pairs) {
    const liftMap = byDate.get(exercise.type as PrimaryLift);
    if (!liftMap) continue;

    const date = session.date.toISOString().slice(0, 10);
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

    const prev = liftMap.get(date);
    if (prev === undefined || e1rm > prev) liftMap.set(date, e1rm);
    allDatesSet.add(date);
  }

  const allDates = [...allDatesSet].sort();

  const last = {} as Record<PrimaryLift, number | undefined>;
  const rows: ChartPoint[] = [];

  for (const date of allDates) {
    const point: ChartPoint = { date };

    for (const lift of LIFT_TYPES) {
      const val = byDate.get(lift)!.get(date);
      if (val !== undefined) {
        last[lift] = val;
        point[lift] = Math.round(val);
      }
    }

    if (LIFT_TYPES.every((lift) => last[lift] !== undefined)) {
      point.total = Math.round(LIFT_TYPES.reduce((sum, lift) => sum + last[lift]!, 0));
    }

    rows.push(point);
  }

  return rows;
}
