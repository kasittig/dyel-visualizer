import type { ConjugateDataPair } from "../types/conjugate";

export function defaultBaselineName(rows: ConjugateDataPair[]): string | null {
  let first: string | null = null;
  const lastDate = new Map<string, Date>();
  const lastE1RM = new Map<string, number>();
  for (const [ex, session] of rows) {
    if (first === null) first = ex.displayName;
    const prev = lastDate.get(ex.displayName);
    if (!prev || session.date > prev) {
      lastDate.set(ex.displayName, session.date);
      lastE1RM.set(ex.displayName, session.e1rm);
    } else if (session.date.getTime() === prev.getTime()) {
      const prevE1RM = lastE1RM.get(ex.displayName) ?? 0;
      if (session.e1rm > prevE1RM) lastE1RM.set(ex.displayName, session.e1rm);
    }
  }

  let bestName: string | null = null;
  let bestDate: Date | null = null;
  let bestE1RM = -Infinity;
  for (const [name, date] of lastDate) {
    const e1rm = lastE1RM.get(name) ?? 0;
    if (
      !bestDate ||
      date > bestDate ||
      (date.getTime() === bestDate.getTime() && e1rm > bestE1RM)
    ) {
      bestName = name;
      bestDate = date;
      bestE1RM = e1rm;
    }
  }
  return bestName ?? first;
}

export function defaultTargetName(rows: ConjugateDataPair[]): string | null {
  let first: string | null = null;
  const seen = new Set<string>();
  for (const [ex] of rows) {
    if (seen.has(ex.displayName)) continue;
    seen.add(ex.displayName);
    if (first === null) first = ex.displayName;
    if (
      ex.bar === "standard" &&
      ex.stance === "competition" &&
      ex.equipment === null &&
      ex.addlWts.length === 0
    )
      return ex.displayName;
  }
  return first;
}
