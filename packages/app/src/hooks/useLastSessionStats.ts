import { useMemo } from "react";
import {
  fitAddlWtOffset,
  fitVariantFactor,
  familyKey,
  variantLabel,
  predictE1RM,
} from "@dyel/core";
import type { ConjugateExercise, TrainingSession } from "@dyel/core";
import type { ConjugateDataPair } from "./useConjugateData";

export function useLastSessionStats(
  pairs: ConjugateDataPair[],
  baselineNames: Partial<Record<string, string>> = {},
  today?: Date
) {
  const resolvedToday = useMemo(() => today ?? new Date(), [today]);
  return useMemo(() => {
    // Build a map of baseline exercise per lift type from the provided display names.
    const baselineExByType = new Map<string, ConjugateExercise>();
    for (const [exercise] of pairs) {
      const targetName = baselineNames[exercise.type];
      if (
        targetName &&
        exercise.displayName === targetName &&
        !baselineExByType.has(exercise.type)
      ) {
        baselineExByType.set(exercise.type, exercise);
      }
    }
    const lastPerformed = new Map<string, Date>();
    const lastSessionE1RM = new Map<string, number>();
    const lastSessionBestSet = new Map<string, { weight: number; reps: number; sets: number }>();
    const sessionsByVariation = new Map<string, TrainingSession[]>();

    // Pass 1: find the most-recent date for each key.
    // This must complete before pass 2 so we know which rows belong to the "last session."
    for (const [exercise, session] of pairs) {
      const key = exercise.displayName;
      const existing = lastPerformed.get(key);
      if (!existing || session.date > existing) lastPerformed.set(key, session.date);

      const sessions = sessionsByVariation.get(key) ?? [];
      sessions.push(session);
      sessionsByVariation.set(key, sessions);
    }

    // Pass 2: compute stats for the last session only.
    for (const [exercise, session] of pairs) {
      const key = exercise.displayName;

      const lastDate = lastPerformed.get(key);
      if (!lastDate || session.date.getTime() !== lastDate.getTime()) continue;

      const prev = lastSessionE1RM.get(key);
      if (prev === undefined || session.e1rm > prev) {
        lastSessionE1RM.set(key, session.e1rm);
        lastSessionBestSet.set(key, {
          weight: session.weight,
          reps: Math.round(session.reps),
          sets: session.sets,
        });
      }
    }

    // Pass 3: fit resistance offset per addlWt exercise display name.
    // Groups sessions by family (type|bar|stance|equipment), then for each variant
    // (any exercise with addlWts) calls fitAddlWtOffset against the straight sessions
    // (addlWts = []) in the same family.
    const straightByFamily = new Map<string, TrainingSession[]>();
    const variantSessionsByName = new Map<string, TrainingSession[]>();
    const variantNameToFamily = new Map<string, string>();

    for (const [exercise, session] of pairs) {
      const key = familyKey(exercise);
      if (exercise.addlWts.length > 0) {
        const sessions = variantSessionsByName.get(exercise.displayName) ?? [];
        sessions.push(session);
        variantSessionsByName.set(exercise.displayName, sessions);
        variantNameToFamily.set(exercise.displayName, key);
      } else {
        const sessions = straightByFamily.get(key) ?? [];
        sessions.push(session);
        straightByFamily.set(key, sessions);
      }
    }

    const addlWtOffset = new Map<string, { offset: number; sampleCount: number }>();
    for (const [name, variantSessions] of variantSessionsByName) {
      const key = variantNameToFamily.get(name)!;
      addlWtOffset.set(name, fitAddlWtOffset(straightByFamily.get(key) ?? [], variantSessions));
    }

    // Pass 4: fit variant factor per bar/stance/equipment exercise.
    const baselineByType = new Map<string, TrainingSession[]>();
    const variantFactorSessionsByName = new Map<string, TrainingSession[]>();
    const variantFactorNameToLabel = new Map<string, string>();
    const variantFactorNameToType = new Map<string, string>();

    for (const [exercise, session] of pairs) {
      const baselineEx = baselineExByType.get(exercise.type);
      const isBaseline = exercise.displayName === baselineEx?.displayName;
      if (isBaseline) {
        const sessions = baselineByType.get(exercise.type) ?? [];
        sessions.push(session);
        baselineByType.set(exercise.type, sessions);
      } else {
        const sessions = variantFactorSessionsByName.get(exercise.displayName) ?? [];
        sessions.push(session);
        variantFactorSessionsByName.set(exercise.displayName, sessions);
        variantFactorNameToLabel.set(exercise.displayName, variantLabel(exercise));
        variantFactorNameToType.set(exercise.displayName, exercise.type);
      }
    }

    const variantFactor = new Map<
      string,
      { factor: number; sampleCount: number; label: string; baselineName: string }
    >();
    for (const [name, sessions] of variantFactorSessionsByName) {
      const type = variantFactorNameToType.get(name)!;
      // don't calculate variant factors for accessories
      if (type === "accessory") {
        continue;
      }
      const label = variantFactorNameToLabel.get(name)!;
      const baselineName = baselineExByType.get(type)?.displayName ?? "baseline";

      // For exercises with additional weights (chains/bands), adjust session weights
      // by the fitted addlWtOffset so the resulting factor reflects only the
      // biomechanical variation, not the weight contribution of the chains/bands.
      // Fall back to unadjusted sessions if no offset is available (no straight-bar
      // sessions in the same family to fit from).
      const offsetEntry = addlWtOffset.get(name);
      const adjustedSessions =
        offsetEntry && offsetEntry.sampleCount > 0
          ? sessions.map((s) => ({ ...s, weight: s.weight + offsetEntry.offset }))
          : sessions;

      const { factor, sampleCount } = fitVariantFactor(
        baselineByType.get(type) ?? [],
        adjustedSessions
      );
      variantFactor.set(name, { factor, sampleCount, label, baselineName });
    }

    const projectedE1RM = new Map<string, number>();
    for (const [name, sessions] of sessionsByVariation) {
      const projected = predictE1RM(sessions, resolvedToday);
      if (projected !== null) projectedE1RM.set(name, projected);
    }

    return {
      lastPerformed,
      lastSessionE1RM,
      lastSessionBestSet,
      addlWtOffset,
      variantFactor,
      projectedE1RM,
    };
  }, [pairs, baselineNames, resolvedToday]);
}

export type SessionStats = ReturnType<typeof useLastSessionStats>;
