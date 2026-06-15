import { calcE1RM, invertE1RM } from "./e1rm";
import { familyKey } from "../types/conjugate";
import type { ConjugateExercise, ConjugateDataPair } from "../types/conjugate";

export type E1RMEstimate = {
  e1rm: number;
  date: Date;
  sourceName: string;
  method: "exact" | "addlWtOffset" | "variantFactor";
};

export type RepCalcStats = {
  addlWtOffset: Map<string, { offset: number; sampleCount: number }>;
  variantFactor: Map<
    string,
    { factor: number; sampleCount: number; label: string; baselineName: string }
  >;
};

export function predictWeightForReps(e1rm: number, reps: number): number {
  if (reps <= 0) return 0;
  return invertE1RM(e1rm, reps);
}

export function predictRepsForWeight(e1rm: number, weight: number): number {
  if (weight <= 0 || weight >= e1rm) return 1;
  return Math.max(1, 30 * (e1rm / weight - 1));
}

export function findBestE1RM(
  pairs: ConjugateDataPair[],
  target: ConjugateExercise,
  stats: RepCalcStats,
  baselineNameForType: string | undefined,
  windowStart: Date,
  windowEnd: Date
): E1RMEstimate | null {
  const { addlWtOffset, variantFactor } = stats;

  // Normalize to local day boundaries so sessions on the start/end dates are always included.
  // CSV dates are UTC midnight (new Date("YYYY-MM-DD")); DayPicker dates are local midnight.
  // Without this, UTC+ users lose end-date sessions and UTC- users lose start-date sessions.
  const dayStart = new Date(
    windowStart.getFullYear(),
    windowStart.getMonth(),
    windowStart.getDate()
  );
  const dayEnd = new Date(
    windowEnd.getFullYear(),
    windowEnd.getMonth(),
    windowEnd.getDate(),
    23,
    59,
    59,
    999
  );

  const exerciseByName = new Map<string, ConjugateExercise>();
  for (const [ex] of pairs) {
    if (!exerciseByName.has(ex.displayName)) exerciseByName.set(ex.displayName, ex);
  }

  const targetFamily = familyKey(target);

  // Pre-scan: for each exercise name find the most recent session within the window,
  // and within that date the best (highest e1rm) set.
  type WindowBest = { date: Date; e1rm: number; set: { weight: number; reps: number } };
  const windowBestByName = new Map<string, WindowBest>();
  for (const [ex, session] of pairs) {
    if (session.date < dayStart || session.date > dayEnd) continue;
    const prev = windowBestByName.get(ex.displayName);
    const t = session.date.getTime();
    const prevT = prev?.date.getTime() ?? -Infinity;
    if (t > prevT || (t === prevT && session.e1rm > (prev?.e1rm ?? 0))) {
      windowBestByName.set(ex.displayName, {
        date: session.date,
        e1rm: session.e1rm,
        set: { weight: session.weight, reps: Math.round(session.reps) },
      });
    }
  }

  // Phase 1: most recently performed exercise in the same family (same bar/stance/equipment).
  // Covers exact matches and addlWt variants (chains/bands on the same setup).
  let bestDate: Date | null = null;
  let bestName: string | null = null;

  for (const [name, ex] of exerciseByName) {
    if (ex.type !== target.type) continue;
    if (target.type === "accessory" ? name !== target.displayName : familyKey(ex) !== targetFamily)
      continue;
    const data = windowBestByName.get(name);
    if (!data) continue;
    if (!bestDate || data.date > bestDate) {
      bestDate = data.date;
      bestName = name;
    }
  }

  if (bestName && bestDate) {
    const sourceEx = exerciseByName.get(bestName)!;
    const sourceData = windowBestByName.get(bestName)!;
    const sourceE1RM = sourceData.e1rm;
    const sourceBestSet = sourceData.set;
    const sourceHasAddl = sourceEx.addlWts.length > 0;
    const targetHasAddl = target.addlWts.length > 0;

    // Accessories: exact match only, no variant adjustments.
    if (target.type === "accessory") {
      return { e1rm: sourceE1RM, date: bestDate, sourceName: bestName, method: "exact" };
    }

    if (sourceEx.displayName === target.displayName || (!sourceHasAddl && !targetHasAddl)) {
      return { e1rm: sourceE1RM, date: bestDate, sourceName: bestName, method: "exact" };
    }

    if (sourceHasAddl && !targetHasAddl) {
      // Source has chains/bands; strip them out via offset.
      // offset = straight_bar_weight - variant_bar_weight at the same rep count
      const off = addlWtOffset.get(bestName);
      if (off && off.sampleCount > 0) {
        return {
          e1rm: calcE1RM(sourceBestSet.weight + off.offset, sourceBestSet.reps),
          date: bestDate,
          sourceName: bestName,
          method: "addlWtOffset",
        };
      }
    }

    if (!sourceHasAddl && targetHasAddl) {
      // Source is straight; estimate what the target's bar weight would be.
      // Try target's own offset, then a proxy with matching addlWts in the same family.
      const proxyOffset =
        addlWtOffset.get(target.displayName) ??
        [...addlWtOffset.entries()].find(([name]) => {
          const ex = exerciseByName.get(name);
          return (
            ex &&
            familyKey(ex) === targetFamily &&
            ex.addlWts.join(",") === target.addlWts.join(",")
          );
        })?.[1];
      if (proxyOffset && proxyOffset.sampleCount > 0) {
        const adjustedWeight = Math.max(0, sourceBestSet.weight - proxyOffset.offset);
        return {
          e1rm: calcE1RM(adjustedWeight, sourceBestSet.reps),
          date: bestDate,
          sourceName: bestName,
          method: "addlWtOffset",
        };
      }
    }
  }

  if (target.type === "accessory") return null;

  // Phase 2: no same-family history. Cross-estimate through baseline via variantFactor.
  // variantFactor[name].factor = e1rm_variant / e1rm_baseline
  // so: e1rm_target = (e1rm_source / sourceFactor) * targetFactor
  let targetFactor: number | null = null;
  if (target.displayName === baselineNameForType) {
    targetFactor = 1.0;
  } else {
    const tvf = variantFactor.get(target.displayName);
    if (tvf && tvf.sampleCount > 0 && tvf.factor > 0) targetFactor = tvf.factor;
  }
  if (targetFactor === null) return null;

  let bestVFDate: Date | null = null;
  let bestVFName: string | null = null;
  let bestVFE1RM: number | null = null;

  function tryVFSource(name: string, sourceFactor: number) {
    const data = windowBestByName.get(name);
    if (!data) return;
    if (!bestVFDate || data.date > bestVFDate) {
      bestVFDate = data.date;
      bestVFName = name;
      bestVFE1RM = (data.e1rm / sourceFactor) * targetFactor!;
    }
  }

  if (baselineNameForType) tryVFSource(baselineNameForType, 1.0);

  for (const [name, vf] of variantFactor) {
    const ex = exerciseByName.get(name);
    if (!ex || ex.type !== target.type) continue;
    if (name === target.displayName) continue;
    if (vf.sampleCount === 0 || vf.factor <= 0) continue;
    tryVFSource(name, vf.factor);
  }

  if (bestVFName && bestVFDate && bestVFE1RM !== null) {
    return {
      e1rm: bestVFE1RM,
      date: bestVFDate,
      sourceName: bestVFName,
      method: "variantFactor",
    };
  }

  return null;
}

export function normalizeToBaseE1RM(
  weight: number,
  reps: number,
  source: ConjugateExercise,
  target: ConjugateExercise,
  stats: RepCalcStats,
  baseline?: ConjugateExercise
): number | null {
  const { addlWtOffset, variantFactor } = stats;

  if (source.displayName === target.displayName) {
    return calcE1RM(weight, reps);
  }

  if (familyKey(source) === familyKey(target)) {
    const sourceHasAddl = source.addlWts.length > 0;
    const targetHasAddl = target.addlWts.length > 0;

    if (sourceHasAddl && !targetHasAddl) {
      const off = addlWtOffset.get(source.displayName);
      if (off && off.sampleCount > 0) return calcE1RM(weight + off.offset, reps);
    } else if (!sourceHasAddl && targetHasAddl) {
      const off = addlWtOffset.get(target.displayName);
      if (off && off.sampleCount > 0) return calcE1RM(Math.max(0, weight - off.offset), reps);
    }
    return null;
  }

  // For cross-family normalization, variantFactors for addlWt exercises are fitted
  // against chain-stripped weights (see useLastSessionStats pass 4), so the source
  // weight must be adjusted by the same offset before dividing by the factor.
  let sourceE1RM = calcE1RM(weight, reps);
  if (source.addlWts.length > 0) {
    const off = addlWtOffset.get(source.displayName);
    if (off && off.sampleCount > 0) sourceE1RM = calcE1RM(weight + off.offset, reps);
  }

  const lookupFactor = (name: string): number | null => {
    if (name === baseline?.displayName) return 1.0;
    const vf = variantFactor.get(name);
    return vf && vf.sampleCount > 0 && vf.factor > 0 ? vf.factor : null;
  };

  const sourceFactor = lookupFactor(source.displayName);
  const targetFactor = lookupFactor(target.displayName);
  if (sourceFactor === null || targetFactor === null) return null;

  return (sourceE1RM / sourceFactor) * targetFactor;
}
