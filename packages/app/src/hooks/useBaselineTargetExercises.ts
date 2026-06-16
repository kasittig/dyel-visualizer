import { useMemo } from "react";
import type { ConjugateExercise } from "@dyel/core";
import type { ConjugateDataPair } from "./useConjugateData";

export function useBaselineTargetExercises(
  pairs: ConjugateDataPair[],
  baselineNames: Partial<Record<string, string>>,
  targetNames: Partial<Record<string, string>>
): {
  baselineExByType: Map<string, ConjugateExercise>;
  targetExByType: Map<string, ConjugateExercise>;
} {
  const baselineExByType = useMemo(() => {
    const m = new Map<string, ConjugateExercise>();
    for (const [ex] of pairs) {
      if (ex.type === "accessory") continue;
      const name = baselineNames[ex.type];
      if (name && ex.displayName === name && !m.has(ex.type)) m.set(ex.type, ex);
    }
    return m;
  }, [pairs, baselineNames]);

  const targetExByType = useMemo(() => {
    const m = new Map<string, ConjugateExercise>();
    for (const [ex] of pairs) {
      if (ex.type === "accessory") continue;
      const name = targetNames[ex.type];
      if (name && ex.displayName === name && !m.has(ex.type)) m.set(ex.type, ex);
    }
    return m;
  }, [pairs, targetNames]);

  return { baselineExByType, targetExByType };
}
