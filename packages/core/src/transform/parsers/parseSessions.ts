import type { TrainingSession, LiftUnits } from '../../types/conjugate';
import { parseSession } from './parseSession';
import { parseRepMaxSessions } from './parseRepMaxSessions';
import type { RawRow } from '../../types/RawRow';

export function parseSessions(row: RawRow, units: LiftUnits): TrainingSession[] {
  const repMaxSessions = parseRepMaxSessions(row, units);
  if (repMaxSessions.length > 0) {
    return repMaxSessions;
  }
  const single = parseSession(row, units);
  return single ? [single] : [];
}
