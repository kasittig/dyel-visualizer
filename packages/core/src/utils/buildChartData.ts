import type { ConjugateDataPair, ConjugateExercise, PrimaryLift } from '../types/conjugate';
import type { RepCalcStats } from './repCalculator';
import { normalizeToBaseE1RM } from './repCalculator';
import { isoDate, recordMax, sortedGridDates, type DateValueGrid } from './chartGrid';

export type ChartPoint = Record<string, string | number>;

const LIFT_TYPES: PrimaryLift[] = ['squat', 'bench', 'deadlift'];
const PRIMARY_LIFTS = new Set<string>(LIFT_TYPES);

export function buildChartData(
  pairs: ConjugateDataPair[],
  baselineExByType: Map<string, ConjugateExercise>,
  targetExByType: Map<string, ConjugateExercise>,
  stats: RepCalcStats
): ChartPoint[] {
  const byDate: DateValueGrid = new Map();

  for (const [exercise, session] of pairs) {
    if (!PRIMARY_LIFTS.has(exercise.type)) {
      continue;
    }

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
      if (normalized === null) {
        continue;
      }
      e1rm = normalized;
    } else {
      e1rm = session.e1rm;
    }

    recordMax(byDate, exercise.type, isoDate(session.date), e1rm);
  }

  const allDates = sortedGridDates(byDate);

  const last = {} as Record<PrimaryLift, number | undefined>;
  const rows: ChartPoint[] = [];

  for (const date of allDates) {
    const point: ChartPoint = { date };

    for (const lift of LIFT_TYPES) {
      const val = byDate.get(lift)?.get(date);
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
