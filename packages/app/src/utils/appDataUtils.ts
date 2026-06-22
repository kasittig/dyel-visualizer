import { defaultBaselineName, defaultCompExerciseName } from '@dyel/core';
import type {
  ConjugateDataPair,
  DeadliftStancePreference,
  GroupedConjugatePairs,
  LiftType,
} from '@dyel/core';
import type { ConjugateDataState } from '../hooks/conjugate/useConjugateData';
import { LIFT_TABS } from './appUtils';
import type { TabState } from './appUtils';

export interface SplitRows {
  all: ConjugateDataPair[];
  maxEffort: ConjugateDataPair[];
  volume: ConjugateDataPair[];
}

export function extractPairs(state: ConjugateDataState): Partial<GroupedConjugatePairs> {
  const pairs = state.status === 'success' ? state.pairs : [];
  return Object.groupBy(pairs, (pair) => pair[0].type);
}

function splitByEffort(pairs: ConjugateDataPair[], type: LiftType): SplitRows {
  if (type === 'accessory') {
    return { all: pairs, maxEffort: pairs, volume: [] };
  }
  const maxEffort: ConjugateDataPair[] = [];
  const volume: ConjugateDataPair[] = [];
  for (const pair of pairs) {
    const [, session] = pair;
    if (session.sets === 1 || session.rpe !== null) {
      maxEffort.push(pair);
    } else {
      volume.push(pair);
    }
  }
  return { all: pairs, maxEffort, volume };
}

export function buildTabRows(dataMap: Partial<GroupedConjugatePairs>): Record<LiftType, SplitRows> {
  return {
    squat: splitByEffort(dataMap['squat'] ?? [], 'squat'),
    bench: splitByEffort(dataMap['bench'] ?? [], 'bench'),
    deadlift: splitByEffort(dataMap['deadlift'] ?? [], 'deadlift'),
    accessory: splitByEffort(dataMap['accessory'] ?? [], 'accessory'),
  };
}

export function computeEffectiveNames(
  tabRows: Record<LiftType, SplitRows>,
  tabState: Record<LiftType, TabState>,
  deadliftStance: DeadliftStancePreference
): {
  effectiveBaselineNames: Partial<Record<LiftType, string>>;
  effectiveTargetNames: Partial<Record<LiftType, string>>;
} {
  const baseline: Partial<Record<LiftType, string>> = {};
  const target: Partial<Record<LiftType, string>> = {};
  for (const tab of LIFT_TABS) {
    const baselineName = defaultBaselineName(tabRows[tab].all);
    if (baselineName) {
      baseline[tab] = baselineName;
    }
    const t = tabState[tab].targetName ?? defaultCompExerciseName(tabRows[tab].all, deadliftStance);
    if (t) {
      target[tab] = t;
    }
  }
  return { effectiveBaselineNames: baseline, effectiveTargetNames: target };
}
