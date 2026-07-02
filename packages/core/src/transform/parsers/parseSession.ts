import type { TrainingSession, LiftUnits } from '../../types/conjugate';

import { findCol } from './findCol';
import { parseSessionDate, parseSessionRpe } from './parseSessionFields';
import { buildTrainingSession } from './buildTrainingSession';
import type { RawRow } from '../../types/RawRow';

export function parseSession(row: RawRow, units: LiftUnits): TrainingSession | null {
  const date = parseSessionDate(row);
  if (!date) {
    return null;
  }

  const weight = parseFloat(findCol(row, 'weight') ?? '');
  const repsRaw = row['reps']?.trim() ?? '';
  const reps = repsRaw === '' ? 1 : parseInt(repsRaw);

  const sets = parseInt(findCol(row, 'sets') ?? '') || 1;
  const rpe = parseSessionRpe(row);
  return buildTrainingSession({ date, sets, rpe, unit: units }, weight, reps);
}
