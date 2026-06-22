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

export function extractPairs(state: ConjugateDataState): Partial<GroupedConjugatePairs> {
  const pairs = state.status === 'success' ? state.pairs : [];
  return Object.groupBy(pairs, (pair) => pair[0].type);
}

export function buildTabRows(
  dataMap: Partial<GroupedConjugatePairs>
): Record<LiftType, ConjugateDataPair[]> {
  return {
    squat: dataMap['squat'] ?? [],
    bench: dataMap['bench'] ?? [],
    deadlift: dataMap['deadlift'] ?? [],
    accessory: dataMap['accessory'] ?? [],
  };
}

export function computeEffectiveNames(
  tabRows: Record<LiftType, ConjugateDataPair[]>,
  tabState: Record<LiftType, TabState>,
  deadliftStance: DeadliftStancePreference
): {
  effectiveBaselineNames: Partial<Record<LiftType, string>>;
  effectiveTargetNames: Partial<Record<LiftType, string>>;
} {
  const baseline: Partial<Record<LiftType, string>> = {};
  const target: Partial<Record<LiftType, string>> = {};
  for (const tab of LIFT_TABS) {
    const baselineName = defaultBaselineName(tabRows[tab]);
    if (baselineName) {
      baseline[tab] = baselineName;
    }
    const t = tabState[tab].targetName ?? defaultCompExerciseName(tabRows[tab], deadliftStance);
    if (t) {
      target[tab] = t;
    }
  }
  return { effectiveBaselineNames: baseline, effectiveTargetNames: target };
}
