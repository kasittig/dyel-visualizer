import type { ConjugateExercise, TrainingSession } from '../types/conjugate';
import { parseSession, type RawSession } from './parsers/parseSession';
import { nameToExercise } from './parsers/nameToExercise';
import { extractCsvRows } from '../extract/csvExtract';

export function parseConjugateData(csv: string): Array<[ConjugateExercise, TrainingSession]> {
  const parsed = extractCsvRows(csv);
  if (!parsed) {
    return [];
  }
  const rows = parsed.rows;

  let hasAnyUnit = false;
  const raw: Array<[ConjugateExercise, RawSession]> = [];
  for (const row of rows) {
    const exerciseName = row['exercise'] ?? '';
    if (!exerciseName) {
      continue;
    }
    const lift = nameToExercise(row['exercise']);
    if (!lift) {
      continue;
    }
    const session = parseSession(row);
    if (!session) {
      continue;
    }
    if (session.unit !== null) {
      hasAnyUnit = true;
    }
    raw.push([lift, session]);
  }

  // Only fall back to "lbs" when no unit annotation exists anywhere in the data.
  return raw.map(([ex, s]) => [ex, { ...s, unit: hasAnyUnit ? (s.unit ?? 'lbs') : 'lbs' }]);
}
