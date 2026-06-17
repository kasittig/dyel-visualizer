import type { ConjugateDataPair } from "../types/conjugate";

export function defaultBaselineName(rows: ConjugateDataPair[]): string | null {
  let first: string | null = null;
  const last = new Map<string, { date: Date; e1rm: number }>();
  let bestName: string | null = null;
  let bestDate: Date | null = null;
  let bestE1RM = -Infinity;

  for (const [ex, session] of rows) {
    const name = ex.displayName;
    if (first === null) first = name;

    const prev = last.get(name);
    if (!prev || session.date > prev.date) {
      last.set(name, { date: session.date, e1rm: session.e1rm });
    } else if (session.date.getTime() === prev.date.getTime() && session.e1rm > prev.e1rm) {
      last.set(name, { date: prev.date, e1rm: session.e1rm });
    }

    const cur = last.get(name)!;
    if (
      !bestDate ||
      cur.date > bestDate ||
      (cur.date.getTime() === bestDate.getTime() && cur.e1rm > bestE1RM)
    ) {
      bestName = name;
      bestDate = cur.date;
      bestE1RM = cur.e1rm;
    }
  }

  return bestName ?? first;
}

export function defaultTargetName(rows: ConjugateDataPair[]): string | null {
  let first: string | null = null;
  let competition: string | null = null;
  let commandsBench: string | null = null;
  const seen = new Set<string>();

  for (const [ex] of rows) {
    if (seen.has(ex.displayName)) continue;
    seen.add(ex.displayName);
    if (first === null) first = ex.displayName;

    if (ex.bar === "standard" && ex.stance === "competition" && ex.addlWts.length === 0) {
      if (ex.type === "bench" && ex.equipment === "pause" && commandsBench === null) {
        commandsBench = ex.displayName;
      } else if (ex.equipment === null && competition === null) {
        competition = ex.displayName;
      }
    }
  }

  return commandsBench ?? competition ?? first;
}
