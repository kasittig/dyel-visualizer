import type { ConjugateExercise, TrainingSession, LiftUnits } from '../types/conjugate';
import { parseSession } from './parsers/parseSession';
import { nameToExercise } from './parsers/nameToExercise';
import { extractCsvRows } from '../extract/csvExtract';
import { detectWeightUnit } from './parsers/detectWeightUnit';

export function parseConjugateData(
  csv: string,
  default_unit: LiftUnits = 'lbs'
): Array<[ConjugateExercise, TrainingSession]> {
  const parsed = extractCsvRows(csv);
  if (!parsed) {
    return [];
  }
  const rows = parsed.rows;
  const unit = detectWeightUnit(Object.keys(rows[0])) ?? default_unit;

  const raw: Array<[ConjugateExercise, TrainingSession]> = [];
  for (const row of rows) {
    const exerciseName = row['exercise'] ?? '';
    if (!exerciseName) {
      continue;
    }
    const lift = nameToExercise(row['exercise']);
    if (!lift) {
      continue;
    }
    const session = parseSession(row, unit);
    if (!session) {
      continue;
    }
    raw.push([lift, session]);
  }
  return raw;
}
