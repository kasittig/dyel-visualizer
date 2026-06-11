import { useMemo } from "react";
import { predictE1RM, fitAddlWtOffset, fitVariantFactor } from "../utils/e1rm";
import { variantLabel } from "../types/conjugate";
import type { ConjugateExercise, TrainingSession } from "../types/conjugate";
import type { ConjugateDataPair } from "./useConjugateData";

function familyKey(ex: ConjugateExercise): string {
  return [ex.type, ex.bar ?? "", ex.stance ?? "", ex.equipment ?? ""].join("|");
}

export function useLastSessionStats(pairs: ConjugateDataPair[]) {
  return useMemo(() => {
    const lastPerformed = new Map<string, Date>();
    const last1RepSet = new Map<string, { date: Date; weight: number }>();
    const lastSessionE1RM = new Map<string, number>();
    const lastSessionBestSet = new Map<string, { weight: number; reps: number }>();
    const lastSessionAllSets = new Map<string, { weight: number; reps: number }[]>();
    const sessionsByKey = new Map<string, TrainingSession[]>();

    // Pass 1: find the most-recent date for each key, and collect all sessions.
    // This must complete before pass 2 so we know which rows belong to the "last session."
    for (const [exercise, session] of pairs) {
      const key = exercise.displayName;

      const existing = lastPerformed.get(key);
      if (!existing || session.date > existing) lastPerformed.set(key, session.date);

      if (session.reps === 1) {
        const prev = last1RepSet.get(key);
        if (!prev || session.date > prev.date)
          last1RepSet.set(key, { date: session.date, weight: session.weight });
      }

      const all = sessionsByKey.get(key) ?? [];
      all.push(session);
      sessionsByKey.set(key, all);
    }

    // Pass 2: compute stats for the last session only.
    for (const [exercise, session] of pairs) {
      const key = exercise.displayName;

      const lastDate = lastPerformed.get(key);
      if (!lastDate || session.date.getTime() !== lastDate.getTime()) continue;

      const prev = lastSessionE1RM.get(key);
      if (prev === undefined || session.e1rm > prev) {
        lastSessionE1RM.set(key, session.e1rm);
        lastSessionBestSet.set(key, { weight: session.weight, reps: Math.round(session.reps) });
      }
      const all = lastSessionAllSets.get(key) ?? [];
      all.push({ weight: session.weight, reps: Math.round(session.reps) });
      lastSessionAllSets.set(key, all);
    }

    const today = new Date();
    const predictedE1RM = new Map<string, number | null>();
    for (const [key, sessions] of sessionsByKey)
      predictedE1RM.set(key, predictE1RM(sessions, today));

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
    // Baseline: bar=standard, stance=competition, equipment=null, addlWts=[].
    // Variant: any exercise where bar≠standard, stance≠competition, or equipment≠null.
    // Exercises with addlWts are also included here when they have a non-baseline
    // bar/stance/equipment — they get both a Pass 3 offset and a Pass 4 factor.
    const baselineByType = new Map<string, TrainingSession[]>();
    const variantFactorSessionsByName = new Map<string, TrainingSession[]>();
    const variantFactorNameToLabel = new Map<string, string>();
    const variantFactorNameToType = new Map<string, string>();

    for (const [exercise, session] of pairs) {
      const isBaseline =
        exercise.bar === "standard" &&
        exercise.stance === "competition" &&
        exercise.equipment === null &&
        exercise.addlWts.length === 0;
      const isVariant =
        exercise.bar !== "standard" ||
        exercise.stance !== "competition" ||
        exercise.equipment !== null;
      if (isBaseline) {
        const sessions = baselineByType.get(exercise.type) ?? [];
        sessions.push(session);
        baselineByType.set(exercise.type, sessions);
      } else if (isVariant) {
        const sessions = variantFactorSessionsByName.get(exercise.displayName) ?? [];
        sessions.push(session);
        variantFactorSessionsByName.set(exercise.displayName, sessions);
        variantFactorNameToLabel.set(exercise.displayName, variantLabel(exercise));
        variantFactorNameToType.set(exercise.displayName, exercise.type);
      }
    }

    const variantFactor = new Map<string, { factor: number; sampleCount: number; label: string }>();
    for (const [name, sessions] of variantFactorSessionsByName) {
      const type = variantFactorNameToType.get(name)!;
      const label = variantFactorNameToLabel.get(name)!;
      const { factor, sampleCount } = fitVariantFactor(baselineByType.get(type) ?? [], sessions);
      variantFactor.set(name, { factor, sampleCount, label });
    }

    return {
      lastPerformed,
      last1RepSet,
      lastSessionE1RM,
      lastSessionBestSet,
      lastSessionAllSets,
      predictedE1RM,
      addlWtOffset,
      variantFactor,
    };
  }, [pairs]);
}
