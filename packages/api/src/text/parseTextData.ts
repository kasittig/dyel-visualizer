import type { LiftType } from '@dyel/pipeline';
import { classifyExerciseName, calcE1RM } from '@dyel/pipeline';

// Local type definitions matching the expected return structure.
// These replace @dyel/core's ConjugateExercise and TrainingSession.
type LiftUnits = 'lbs' | 'kg';

interface ParsedExercise {
  type: LiftType;
  displayName: string;
}

interface ParsedSession {
  date: Date;
  weight: number;
  reps: number;
  sets: number;
  unit: LiftUnits;
  e1rm: number;
  rpe: number | null;
}

/**
 * Parses pasted free-form text (one exercise per line) into structured data.
 * Each line is parsed independently: exercise name, weight, reps, and optional unit.
 * No dates required; defaults to today. Uses pipeline-native classifyExerciseName
 * and calcE1RM to replace @dyel/core functionality.
 */
export function parseTextData(
  text: string,
  default_unit: LiftUnits = 'lbs'
): Array<[ParsedExercise, ParsedSession]> {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const result: Array<[ParsedExercise, ParsedSession]> = [];

  for (const line of lines) {
    const parsed = parseTextLine(line, default_unit);
    if (parsed) {
      result.push(parsed);
    }
  }

  return result;
}

/**
 * Parses a single text line into [ParsedExercise, ParsedSession] or null.
 * Handles formats like "comp squat 1rm 300lbs" or "bench 225lbs x5".
 */
function parseTextLine(
  line: string,
  default_unit: LiftUnits
): [ParsedExercise, ParsedSession] | null {
  const tokens = line.split(/\s+/);
  if (tokens.length < 2) {
    return null;
  }

  // Try rep-max grammar: "exercise ... Nrm weight[unit]"
  const rmMatch = tryRepMaxGrammar(tokens);
  if (rmMatch) {
    const { exercise, weight, unit, reps } = rmMatch;
    return buildResult(exercise, weight, unit || default_unit, reps, 1, null);
  }

  // Try sets-by-reps grammar: "exercise ... [N] NxN @ weight[unit]"
  const setsMatch = trySetsxRepsGrammar(tokens);
  if (setsMatch) {
    const { exercise, weight, unit, sets, reps } = setsMatch;
    return buildResult(exercise, weight, unit || default_unit, reps, sets, null);
  }

  // Try plain weight/reps grammar: "exercise weight[unit] [xN]"
  const plainMatch = tryPlainGrammar(tokens);
  if (plainMatch) {
    const { exercise, weight, unit, reps } = plainMatch;
    return buildResult(exercise, weight, unit || default_unit, reps, 1, null);
  }

  return null;
}

/**
 * Detects rep-max format: "exercise 1rm 300lbs" → {exercise, weight, unit, reps}
 */
function tryRepMaxGrammar(
  tokens: string[]
): { exercise: string; weight: number; unit: string | undefined; reps: number } | null {
  if (tokens.length < 3) {
    return null;
  }

  const rmIdx = tokens.findIndex((t) => /^(\d+)rm$/i.test(t));
  if (rmIdx < 1) {
    return null;
  }

  const weightStr = tokens[rmIdx + 1];
  if (!weightStr) {
    return null;
  }

  const weightMatch = /^(\d+(?:\.\d+)?)(lbs|kg)?$/i.exec(weightStr);
  if (!weightMatch) {
    return null;
  }

  const [, weightVal, unit] = weightMatch;
  const exercise = tokens.slice(0, rmIdx).join(' ');
  const reps = parseInt(tokens[rmIdx].match(/\d+/)![0]);

  return { exercise, weight: parseFloat(weightVal), unit, reps };
}

/**
 * Detects sets-by-reps format: "exercise [optional-dash] NxN @ weight[unit]"
 */
function trySetsxRepsGrammar(tokens: string[]): {
  exercise: string;
  weight: number;
  unit: string | undefined;
  sets: number;
  reps: number;
} | null {
  if (tokens.length < 4) {
    return null;
  }

  const atIdx = tokens.indexOf('@');
  if (atIdx < 2) {
    return null;
  }

  const setsRepsStr = tokens[atIdx - 1];
  const setsRepsMatch = /^(\d+)x(\d+)$/i.exec(setsRepsStr);
  if (!setsRepsMatch) {
    return null;
  }

  const weightStr = tokens[atIdx + 1];
  if (!weightStr) {
    return null;
  }

  const weightMatch = /^(\d+(?:\.\d+)?)(lbs|kg)?$/i.exec(weightStr);
  if (!weightMatch) {
    return null;
  }

  const [, weightVal, unit] = weightMatch;
  const [, sets, reps] = setsRepsMatch;

  let exerciseEnd = atIdx - 1;
  if (tokens[atIdx - 2] === '-') {
    exerciseEnd = atIdx - 2;
  }

  const exercise = tokens.slice(0, exerciseEnd).join(' ');
  return {
    exercise,
    weight: parseFloat(weightVal),
    unit,
    sets: parseInt(sets),
    reps: parseInt(reps),
  };
}

/**
 * Detects plain format: "exercise weight[unit] [xN]"
 */
function tryPlainGrammar(
  tokens: string[]
): { exercise: string; weight: number; unit: string | undefined; reps: number } | null {
  if (tokens.length < 2) {
    return null;
  }

  let reps = 1;
  let weightIdx = tokens.length - 1;

  const lastToken = tokens[tokens.length - 1];
  const repsMatch = /^x(\d+)$/i.exec(lastToken);
  if (repsMatch) {
    reps = parseInt(repsMatch[1]);
    weightIdx = tokens.length - 2;
  }

  if (weightIdx < 1) {
    return null;
  }

  const weightStr = tokens[weightIdx];
  const weightMatch = /^(\d+(?:\.\d+)?)(lbs|kg)?$/i.exec(weightStr);
  if (!weightMatch) {
    return null;
  }

  const [, weightVal, unit] = weightMatch;
  const exercise = tokens.slice(0, weightIdx).join(' ');

  return { exercise, weight: parseFloat(weightVal), unit, reps };
}

/**
 * Constructs [ParsedExercise, ParsedSession] using pipeline utilities.
 */
function buildResult(
  exerciseName: string,
  weightLbs: number,
  unit: string | undefined,
  reps: number,
  sets: number,
  rpe: number | null
): [ParsedExercise, ParsedSession] | null {
  if (!exerciseName.trim() || isNaN(weightLbs) || reps <= 0) {
    return null;
  }

  const classified = classifyExerciseName(exerciseName);

  // Normalize unit to LiftUnits
  const finalUnit = (unit?.toLowerCase() === 'kg' ? 'kg' : 'lbs') as LiftUnits;

  // Convert weight to kg if needed
  const weightKg = finalUnit === 'lbs' ? weightLbs * 0.453592 : weightLbs;
  const e1rm = calcE1RM(weightKg, reps, rpe);

  const exercise: ParsedExercise = {
    type: classified.type,
    displayName: exerciseName,
  };

  const session: ParsedSession = {
    date: new Date(),
    weight: weightLbs, // Keep weight in original unit for tests
    reps,
    sets,
    unit: finalUnit,
    e1rm, // e1rm in kg (pipeline convention)
    rpe,
  };

  return [exercise, session];
}
