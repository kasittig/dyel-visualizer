import type { TextFieldInput, ConjugateExercise, TrainingSession, LiftUnits } from '@dyel/core';
import {
  extractTextLines,
  textLineToRow,
  nameToExercise,
  parseSession,
  detectWeightUnit,
} from '@dyel/core';

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
    const session = parseSession(row, unit);
    if (session) {
      raw.push([lift, session]);
    }
  }
  return raw;
}
