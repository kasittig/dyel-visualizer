import type { TaggedSetRecord } from '../tag/tag';
import type { SetRecord } from '../types';
import { calcE1RM } from './e1rm';

export interface SeriesDeriver {
  id: string;
  derive(daySets: TaggedSetRecord[]): number | null;
}

// A set logged with 2+ working sets (e.g. "9x3 speed bench") is dynamic/repetition-effort
// volume work, not a near-maximal attempt — Epley on that load wildly underestimates 1RM.
// An attached RPE means the lifter explicitly rated the effort, so trust it regardless of
// set count. Exclude everything else from e1rm derivation unless a day has nothing but
// speed-work sets.
const SPEED_WORK_SET_THRESHOLD = 2;
const MAX_EFFORT_REPS = 5;
export const isSpeedWork = (s: Pick<SetRecord, 'rpe' | 'sets' | 'meta'>) =>
  s.rpe === undefined && Number(s.sets ?? s.meta?.sets ?? 1) >= SPEED_WORK_SET_THRESHOLD;

export const selectMaxEffortSet = (sets: TaggedSetRecord[]): TaggedSetRecord | null => {
  let best: TaggedSetRecord | null = null;
  let bestE1rm = -Infinity;
  for (const set of sets) {
    if (set.reps <= MAX_EFFORT_REPS && !isSpeedWork(set)) {
      const e1rm = calcE1RM(set.weight, set.reps, set.rpe);
      if (e1rm > bestE1rm) {
        best = set;
        bestE1rm = e1rm;
      }
    }
  }
  return best;
};

export const derivers: Record<string, SeriesDeriver> = {
  e1rm: {
    id: 'e1rm',
    derive: (sets) => {
      const effortSets = sets.filter((s) => !isSpeedWork(s));
      const usable = effortSets.length ? effortSets : sets;
      return usable.length ? Math.max(...usable.map((s) => calcE1RM(s.weight, s.reps, s.rpe))) : 0;
    },
  },
  'e1rm-max-effort': {
    id: 'e1rm-max-effort',
    derive: (sets) => {
      const best = selectMaxEffortSet(sets);
      return best ? calcE1RM(best.weight, best.reps, best.rpe) : null;
    },
  },
  tonnage: {
    id: 'tonnage',
    derive: (sets) => sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
  },
  'top-set': {
    id: 'top-set',
    derive: (sets) => (sets.length ? Math.max(...sets.map((s) => s.weight)) : 0),
  },
};
