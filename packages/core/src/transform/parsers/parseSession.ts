import type { TrainingSession, LiftUnits } from '../../types/conjugate';
import { calcE1RM } from '../../utils/math/e1rm';

import { findCol } from './findCol';
import { parseSessionDate, parseSessionRpe } from './parseSessionFields';
import type { RawRow } from '../../types/RawRow';

export function parseSession(row: RawRow, units: LiftUnits): TrainingSession | null {
  const date = parseSessionDate(row);
  if (!date) {
    return null;
  }

  const weight = parseFloat(findCol(row, 'weight') ?? '');
  const repsRaw = row['reps']?.trim() ?? '';
  const reps = repsRaw === '' ? 1 : parseInt(repsRaw);
  if (isNaN(weight) || isNaN(reps) || reps <= 0) {
    return null;
  }

  const sets = parseInt(findCol(row, 'sets') ?? '') || 1;
  const rpe = parseSessionRpe(row);
  return {
    date,
    sets,
    reps,
    weight,
    e1rm: calcE1RM(weight, reps, rpe),
    unit: units,
    rpe,
  };
}
