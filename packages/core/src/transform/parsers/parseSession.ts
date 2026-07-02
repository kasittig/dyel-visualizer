import type { TrainingSession, LiftUnits } from '../../types/conjugate';
import { calcE1RM } from '../../utils/math/e1rm';

import { findCol } from './findCol';
import type { RawRow } from '../../types/RawRow';

export function parseSession(row: RawRow, units: LiftUnits): TrainingSession | null {
  const dateStr = row['date']?.trim() ?? '';
  let date: Date;
  if (!dateStr) {
    const t = new Date();
    date = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  } else {
    date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(dateStr + 'T00:00:00')
      : new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  const weight = parseFloat(findCol(row, 'weight') ?? '');
  const reps = parseInt(row['reps'] ?? '');
  if (isNaN(weight) || isNaN(reps) || reps <= 0) {
    return null;
  }

  const sets = parseInt(findCol(row, 'sets') ?? '') || 1;
  const rpeRaw = parseFloat(row['rpe']?.trim() ?? '');
  const rpe = !isNaN(rpeRaw) && rpeRaw >= 1 && rpeRaw <= 10 ? rpeRaw : null;
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
