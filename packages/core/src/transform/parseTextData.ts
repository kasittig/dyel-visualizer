import type { ConjugateExercise, TrainingSession, LiftUnits } from '../types/conjugate';
import type { TextFieldInput } from '../types/TextFieldInput';
import { extractTextLines } from '../extract/textExtract';
import { textLineToRow } from './parsers/textLineToRow';
import { nameToExercise } from './parsers/nameToExercise';
import { parseSessions } from './parsers/parseSessions';
import { detectWeightUnit } from './parsers/detectWeightUnit';

export function parseTextData(
  text: TextFieldInput,
  default_unit: LiftUnits = 'lbs'
): Array<[ConjugateExercise, TrainingSession]> {
  const lines = extractTextLines(text);
  if (!lines) {
    return [];
  }

  const raw: Array<[ConjugateExercise, TrainingSession]> = [];
  for (const line of lines) {
    const row = textLineToRow(line);
    if (!row) {
      continue;
    }
    const exerciseName = row['exercise'] ?? '';
    if (!exerciseName) {
      continue;
    }
    const lift = nameToExercise(exerciseName);
    if (!lift) {
      continue;
    }
    const unit = detectWeightUnit(Object.keys(row)) ?? default_unit;
    for (const session of parseSessions(row, unit)) {
      raw.push([lift, session]);
    }
  }
  return raw;
}
