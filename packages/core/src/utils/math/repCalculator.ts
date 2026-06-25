import { calcE1RM, invertE1RM } from './e1rm';
import { familyKey } from '../../types/conjugate';
import type { ConjugateExercise, TrainingSession } from '../../types/conjugate';
import type { SessionStats } from '../stats/sessionIndex';

export interface E1RMEstimate {
  e1rm: number;
  date: Date;
  sourceName: string;
  method: 'exact' | 'variantFactor';
}

export interface RepCalcStats {
  addlWtOffset: Map<string, { offset: number; sampleCount: number }>;
  variantFactor: Map<
    string,
    { factor: number; sampleCount: number; label: string; baselineName: string }
  >;
}

export function predictWeightForReps(e1rm: number, reps: number): number {
  if (reps <= 0) {
    return 0;
  }
  return invertE1RM(e1rm, reps);
}

export function predictRepsForWeight(e1rm: number, weight: number): number {
  if (weight <= 0 || weight >= e1rm) {
    return 1;
  }
  return Math.max(1, 30 * (e1rm / weight - 1));
}

// Predicts the current e1RM for `target` by anchoring to the comp baseline's projected
// e1RM and applying the empirically-fitted variant factor. For chain/band exercises the
// chain-stripped factor is used, and the addlWt offset (effective chain weight) is then
// subtracted — approximation valid because offset and e1RM share the same weight unit.
export function findBestE1RM(
  target: ConjugateExercise,
  stats: SessionStats,
  baselineNameForType: string | undefined,
  today: Date
): E1RMEstimate | null {
  const { projectedE1RM, variantFactor, addlWtOffset } = stats;
  if (!baselineNameForType) {
    return null;
  }

  const compE1RM = projectedE1RM.get(baselineNameForType);
  if (compE1RM == null) {
    return null;
  }

  if (target.displayName === baselineNameForType) {
    return { e1rm: compE1RM, date: today, sourceName: baselineNameForType, method: 'exact' };
  }

  const vf = variantFactor.get(target.displayName);
  if (!vf || vf.sampleCount === 0 || vf.factor <= 0) {
    return null;
  }

  let e1rm = compE1RM * vf.factor;

  if (target.addlWts.length > 0) {
    const off = addlWtOffset.get(target.displayName);
    if (off && off.sampleCount > 0) {
      e1rm = Math.max(0, e1rm - off.offset);
    }
  }

  return { e1rm, date: today, sourceName: baselineNameForType, method: 'variantFactor' };
}

export function normalizeToBaseE1RM(
  session: TrainingSession,
  source: ConjugateExercise,
  target: ConjugateExercise,
  stats: RepCalcStats,
  baseline?: ConjugateExercise
): number | null {
  const { weight, reps, rpe } = session;
  const { addlWtOffset, variantFactor } = stats;

  if (source.displayName === target.displayName) {
    return calcE1RM(weight, reps, rpe);
  }

  if (familyKey(source) === familyKey(target)) {
    const sourceHasAddl = source.addlWts.length > 0;
    const targetHasAddl = target.addlWts.length > 0;

    if (sourceHasAddl && !targetHasAddl) {
      const off = addlWtOffset.get(source.displayName);
      if (off && off.sampleCount > 0) {
        return calcE1RM(weight + off.offset, reps, rpe);
      }
    } else if (!sourceHasAddl && targetHasAddl) {
      const off = addlWtOffset.get(target.displayName);
      if (off && off.sampleCount > 0) {
        return calcE1RM(Math.max(0, weight - off.offset), reps, rpe);
      }
    }
    return null;
  }

  // For cross-family normalization, variantFactors for addlWt exercises are fitted
  // against chain-stripped weights (see useLastSessionStats pass 4), so the source
  // weight must be adjusted by the same offset before dividing by the factor.
  let sourceE1RM = calcE1RM(weight, reps, rpe);
  if (source.addlWts.length > 0) {
    const off = addlWtOffset.get(source.displayName);
    if (off && off.sampleCount > 0) {
      sourceE1RM = calcE1RM(weight + off.offset, reps, rpe);
    }
  }

  function lookupFactor(name: string): number | null {
    if (name === baseline?.displayName) {
      return 1.0;
    }
    const vf = variantFactor.get(name);
    return vf && vf.sampleCount > 0 && vf.factor > 0 ? vf.factor : null;
  }

  const sourceFactor = lookupFactor(source.displayName);
  const targetFactor = lookupFactor(target.displayName);
  if (sourceFactor === null || targetFactor === null) {
    return null;
  }

  return (sourceE1RM / sourceFactor) * targetFactor;
}
