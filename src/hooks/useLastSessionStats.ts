import { useMemo } from "react";
import { predictE1RM, fitChainOffset } from "../utils/e1rm";
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

    // Pass 3: fit chain offset per chain exercise display name.
    // Groups sessions by family (type|bar|stance|equipment), then for each chain variant
    // calls fitChainOffset against the straight sessions in the same family.
    const straightByFamily = new Map<string, TrainingSession[]>();
    const chainSessionsByName = new Map<string, TrainingSession[]>();
    const chainNameToFamily = new Map<string, string>();

    for (const [exercise, session] of pairs) {
      const key = familyKey(exercise);
      if (exercise.addlWts.includes("chains")) {
        const sessions = chainSessionsByName.get(exercise.displayName) ?? [];
        sessions.push(session);
        chainSessionsByName.set(exercise.displayName, sessions);
        chainNameToFamily.set(exercise.displayName, key);
      } else {
        const sessions = straightByFamily.get(key) ?? [];
        sessions.push(session);
        straightByFamily.set(key, sessions);
      }
    }

    const chainOffset = new Map<string, { offset: number; sampleCount: number }>();
    for (const [name, chainSessions] of chainSessionsByName) {
      const key = chainNameToFamily.get(name)!;
      chainOffset.set(name, fitChainOffset(straightByFamily.get(key) ?? [], chainSessions));
    }

    return {
      lastPerformed,
      last1RepSet,
      lastSessionE1RM,
      lastSessionBestSet,
      lastSessionAllSets,
      predictedE1RM,
      chainOffset,
    };
  }, [pairs]);
}
