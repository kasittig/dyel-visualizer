import { useMemo } from "react";
import { calcE1RM, predictE1RM } from "../utils/e1rm";
import type { ConjugateDataPair } from "./useConjugateData";

export function useLastSessionStats(pairs: ConjugateDataPair[]) {
  return useMemo(() => {
    const lastPerformed = new Map<string, Date>();
    const last1RepSet = new Map<string, { date: Date; weight: number }>();
    const lastSessionE1RM = new Map<string, number>();
    const lastSessionBestSet = new Map<string, { weight: number; reps: number }>();
    const lastSessionAllSets = new Map<string, { weight: number; reps: number }[]>();
    const e1rmHistory = new Map<string, Map<string, number>>();

    // Pass 1: find the most-recent date for each key, and build full e1RM history.
    // This must complete before pass 2 so we know which rows belong to the "last session."
    for (const [exercise, session] of pairs) {
      const key = exercise.displayName;
      const { date, weight, reps } = session;
      const dateStr = date.toISOString();

      const existing = lastPerformed.get(key);
      if (!existing || date > existing) lastPerformed.set(key, date);

      if (reps === 1) {
        const prev = last1RepSet.get(key);
        if (!prev || date > prev.date) last1RepSet.set(key, { date, weight });
      }
      if (reps > 0) {
        const e1rm = calcE1RM(weight, reps);
        if (!e1rmHistory.has(key)) e1rmHistory.set(key, new Map());
        const dateMap = e1rmHistory.get(key)!;
        const prevBest = dateMap.get(dateStr);
        if (prevBest === undefined || e1rm > prevBest) dateMap.set(dateStr, e1rm);
      }
    }

    // Pass 2: compute e1RM and set stats for the last session only.
    for (const [exercise, session] of pairs) {
      const key = exercise.displayName;
      const { date, weight, reps } = session;

      const lastDate = lastPerformed.get(key);
      if (!lastDate || date.getTime() !== lastDate.getTime()) continue;

      if (reps > 0) {
        const roundedReps = Math.round(reps);
        const e1rm = calcE1RM(weight, reps);
        const prev = lastSessionE1RM.get(key);
        if (prev === undefined || e1rm > prev) {
          lastSessionE1RM.set(key, e1rm);
          lastSessionBestSet.set(key, { weight, reps: roundedReps });
        }
        const all = lastSessionAllSets.get(key) ?? [];
        all.push({ weight, reps: roundedReps });
        lastSessionAllSets.set(key, all);
      }
    }

    const today = new Date();
    const predictedE1RM = new Map<string, number | null>();
    for (const [key, dateMap] of e1rmHistory) predictedE1RM.set(key, predictE1RM(dateMap, today));

    return {
      lastPerformed,
      last1RepSet,
      lastSessionE1RM,
      lastSessionBestSet,
      lastSessionAllSets,
      predictedE1RM,
    };
  }, [pairs]);
}
