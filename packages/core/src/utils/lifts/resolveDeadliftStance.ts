// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../../global.d.ts" />

import type { ConjugateExercise, DeadliftStancePreference } from '../../types/conjugate';

// Resolves a deadlift's actual stance (sumo or conventional) accounting for
// 'opposite' and null stances relative to the user's primary preference.
export function resolveDeadliftStance(
  ex: ConjugateExercise,
  deadliftStance: DeadliftStancePreference
): 'sumo' | 'conventional' {
  if (ex.stance === 'sumo' || ex.stance === 'conventional') {
    return ex.stance;
  }
  if (ex.stance === 'opposite') {
    return deadliftStance === 'sumo' ? 'conventional' : 'sumo';
  }
  return deadliftStance;
}
