import type { TrainingSession, LiftUnits } from '../../types/conjugate';
import { calcE1RM } from '../../utils/math/e1rm';

import { findCol } from './findCol';
import { findRepMaxCols } from './findRepMaxCols';
import { parseSessionDate, parseSessionRpe } from './parseSessionFields';
import type { RawRow } from '../../types/RawRow';

export function parseRepMaxSessions(row: RawRow, units: LiftUnits): TrainingSession[] {
  const cols = findRepMaxCols(row);
  if (cols.length === 0) {
    return [];
  }

  const date = parseSessionDate(row);
  if (!date) {
    return [];
  }

  const sets = parseInt(findCol(row, 'sets') ?? '') || 1;
  const rpe = parseSessionRpe(row);

  const sessions: TrainingSession[] = [];
  for (const { reps, value } of cols) {
    const weight = parseFloat(value);
    if (isNaN(weight) || reps <= 0) {
      continue;
    }
    sessions.push({
      date,
      sets,
      reps,
      weight,
      e1rm: calcE1RM(weight, reps, rpe),
      unit: units,
      rpe,
    });
  }
  return sessions;
}
