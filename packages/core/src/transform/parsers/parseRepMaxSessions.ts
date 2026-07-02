import type { TrainingSession, LiftUnits } from '../../types/conjugate';

import { findCol } from './findCol';
import { findRepMaxCols } from './findRepMaxCols';
import { parseSessionDate, parseSessionRpe } from './parseSessionFields';
import { buildTrainingSession } from './buildTrainingSession';
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
  const base = { date, sets, rpe, unit: units };

  const sessions: TrainingSession[] = [];
  for (const { reps, value } of cols) {
    const session = buildTrainingSession(base, parseFloat(value), reps);
    if (session) {
      sessions.push(session);
    }
  }
  return sessions;
}
