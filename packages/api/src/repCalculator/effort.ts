import { predictWeightForReps } from './repCalculatorUtils';

export type EffortMode = 'rpe' | 'pct';

export interface Effort {
  mode: EffortMode;
  value: number;
}

export function predictWeightForRepsAndEffort(e1rm: number, reps: number, effort: Effort): number {
  if (effort.mode === 'pct') {
    return e1rm * (effort.value / 100);
  }
  const effectiveReps = reps + (10 - effort.value);
  return predictWeightForReps(e1rm, effectiveReps);
}

export function convertEffort(reps: number, effort: Effort, toMode: EffortMode): number {
  if (effort.mode === toMode) {
    return effort.value;
  }
  if (toMode === 'pct') {
    const effectiveReps = reps + (10 - effort.value);
    const pct = effectiveReps <= 1 ? 100 : 100 / (1 + effectiveReps / 30);
    return Math.round(pct); // round to nearest whole percent, matching the % mode's step of 1
  }
  // toMode === 'rpe', effort.mode === 'pct'
  const pct = effort.value;
  const effectiveReps = pct >= 100 ? 0 : 30 * (100 / pct - 1);
  const rpe = 10 - (effectiveReps - reps);
  const clamped = Math.min(10, Math.max(1, rpe));
  return Math.round(clamped * 2) / 2; // round to nearest 0.5
}
