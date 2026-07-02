import type { TrainingSession, LiftUnits } from '../../types/conjugate';
import { calcE1RM } from '../../utils/math/e1rm';

export interface TrainingSessionBase {
  date: Date;
  sets: number;
  rpe: number | null;
  unit: LiftUnits;
}

/**
 * Validates a weight/reps pair and builds the resulting `TrainingSession`, shared by
 * `parseSession.ts` (single weight/reps row) and `parseRepMaxSessions.ts` (one call per
 * populated rep-max column).
 */
export function buildTrainingSession(
  base: TrainingSessionBase,
  weight: number,
  reps: number
): TrainingSession | null {
  if (isNaN(weight) || isNaN(reps) || reps <= 0) {
    return null;
  }
  return {
    ...base,
    reps,
    weight,
    e1rm: calcE1RM(weight, reps, base.rpe),
  };
}
