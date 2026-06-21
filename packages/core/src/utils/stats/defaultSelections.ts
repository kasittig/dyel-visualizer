import type { ConjugateDataPair } from '../../types/conjugate';

// Always default to the most recent exercise performed
export function defaultBaselineName(rows: ConjugateDataPair[]): string | null {
  let name: string | null = null;
  let date: Date | null = null;
  let e1rm: number | null = null;

  for (const [ex, session] of rows) {
    name = name ?? ex.displayName;
    date = date ?? session.date;
    e1rm = e1rm ?? session.e1rm;

    if (
      session.date.getTime() > date.getTime() ||
      (session.date.getTime() === date.getTime() && session.e1rm > e1rm)
    ) {
      name = ex.displayName;
      date = session.date;
      e1rm = session.e1rm;
    }
  }
  return name;
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
