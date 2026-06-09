import { useMemo } from "react";
import type { SheetRow } from "./useSheetData";
import { findCol } from "./useSheetData";
import { calcE1RM } from "../utils/calcE1RM";

function parseDate(str: string): Date | null {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function useLastSessionStats(rows: SheetRow[], keyFn: (row: SheetRow) => string | null) {
  return useMemo(() => {
    const lastPerformed = new Map<string, Date>();
    const last1RepSet = new Map<string, { date: Date; weight: number }>();
    const lastSessionE1RM = new Map<string, number>();
    const lastSessionBestSet = new Map<string, { weight: number; reps: number }>();
    const lastSessionAllSets = new Map<string, { weight: number; reps: number }[]>();

    // Pass 1: find the most-recent date for each key.
    // This must complete before pass 2 so we know which rows belong to the "last session."
    for (const row of rows) {
      const key = keyFn(row);
      if (!key) continue;
      const date = parseDate(row["date"]?.trim() ?? "");
      if (!date) continue;

      const existing = lastPerformed.get(key);
      if (!existing || date > existing) lastPerformed.set(key, date);

      const weight = parseFloat(findCol(row, "weight") ?? "");
      const repsStr = row["reps"]?.trim() ?? "";
      if (!isNaN(weight) && parseFloat(repsStr) === 1) {
        const prev = last1RepSet.get(key);
        if (!prev || date > prev.date) last1RepSet.set(key, { date, weight });
      }
    }

    // Pass 2: compute e1RM and set stats for the last session only.
    for (const row of rows) {
      const key = keyFn(row);
      if (!key) continue;
      const date = parseDate(row["date"]?.trim() ?? "");
      if (!date) continue;

      const lastDate = lastPerformed.get(key);
      if (!lastDate || date.getTime() !== lastDate.getTime()) continue;

      const weight = parseFloat(findCol(row, "weight") ?? "");
      const reps = parseFloat(row["reps"] ?? "");
      if (!isNaN(weight) && !isNaN(reps) && reps > 0) {
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

    return { lastPerformed, last1RepSet, lastSessionE1RM, lastSessionBestSet, lastSessionAllSets };
  }, [rows, keyFn]);
}
