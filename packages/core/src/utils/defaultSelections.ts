import type { ConjugateDataPair } from '../types/conjugate';

export function defaultBaselineName(rows: ConjugateDataPair[]): string | null {
  let first: string | null = null;
  const last = new Map<string, { date: Date; e1rm: number }>();
  let bestName: string | null = null;
  let bestDate: Date | null = null;
  let bestE1RM = -Infinity;

  for (const [ex, session] of rows) {
    const name = ex.displayName;
    if (first === null) {
      first = name;
    }

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
  if (rows.length === 0) {
    return null;
  }
  const first = rows[0][0].displayName;

  const all_competition = rows.filter(
    (row) =>
      row[0].bar === 'standard' && row[0].stance === 'competition' && row[0].addlWts.length === 0
  );
  if (all_competition.length === 0) {
    return first;
  }

  const commandsBench = all_competition.filter(
    (row) => row[0].equipment === 'pause' && row[0].type === 'bench'
  );
  if (commandsBench.length > 0) {
    return commandsBench[0][0].displayName;
  }

  const competition = all_competition.filter((row) => row[0].equipment === null);
  if (competition.length > 0) {
    return competition[0][0].displayName;
  }

  return first;
}
