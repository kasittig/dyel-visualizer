import type { LiftType } from '@dyel/pipeline';
import { classifyExerciseName, calcE1RM } from '@dyel/pipeline';

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

export function parseTextData(
  text: string,
  default_unit: LiftUnits = 'lbs',
  now: Date = new Date()
): Array<[ParsedExercise, ParsedSession]> {
  const result: Array<[ParsedExercise, ParsedSession]> = [];
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    const parsed = parseTextLine(line, default_unit, now);
    if (parsed) {
      result.push(parsed);
    }
  }
  return result;
}

function parseTextLine(
  line: string,
  default_unit: LiftUnits,
  now: Date
): [ParsedExercise, ParsedSession] | null {
  const tokens = line.split(/\s+/);
  if (tokens.length < 2) {
    return null;
  }

  const rm = tryRepMaxGrammar(tokens);
  if (rm) {
    return buildResult(rm.exercise, rm.weight, rm.unit || default_unit, rm.reps, 1, null, now);
  }

  const sxr = trySetsxRepsGrammar(tokens);
  if (sxr) {
    return buildResult(
      sxr.exercise,
      sxr.weight,
      sxr.unit || default_unit,
      sxr.reps,
      sxr.sets,
      null,
      now
    );
  }

  const plain = tryPlainGrammar(tokens);
  if (plain) {
    return buildResult(
      plain.exercise,
      plain.weight,
      plain.unit || default_unit,
      plain.reps,
      1,
      null,
      now
    );
  }
  return null;
}

function tryRepMaxGrammar(tokens: string[]) {
  if (tokens.length < 3) {
    return null;
  }
  const rmIdx = tokens.findIndex((t) => /^(\d+)rm$/i.test(t));
  if (rmIdx < 1 || !tokens[rmIdx + 1]) {
    return null;
  }

  const match = /^(\d+(?:\.\d+)?)(lbs|kg)?$/i.exec(tokens[rmIdx + 1]);
  if (!match) {
    return null;
  }
  return {
    exercise: tokens.slice(0, rmIdx).join(' '),
    weight: parseFloat(match[1]),
    unit: match[2],
    reps: parseInt(tokens[rmIdx]),
  };
}

function trySetsxRepsGrammar(tokens: string[]) {
  const atIdx = tokens.indexOf('@');
  if (atIdx < 2 || !tokens[atIdx + 1]) {
    return null;
  }

  const sxrMatch = /^(\d+)x(\d+)$/i.exec(tokens[atIdx - 1]);
  const wtMatch = /^(\d+(?:\.\d+)?)(lbs|kg)?$/i.exec(tokens[atIdx + 1]);
  if (!sxrMatch || !wtMatch) {
    return null;
  }

  const exerciseEnd = tokens[atIdx - 2] === '-' ? atIdx - 2 : atIdx - 1;
  return {
    exercise: tokens.slice(0, exerciseEnd).join(' '),
    weight: parseFloat(wtMatch[1]),
    unit: wtMatch[2],
    sets: parseInt(sxrMatch[1]),
    reps: parseInt(sxrMatch[2]),
  };
}

function tryPlainGrammar(tokens: string[]) {
  if (tokens.length < 2) {
    return null;
  }
  let reps = 1;
  let wtIdx = tokens.length - 1;

  const repsMatch = /^x(\d+)$/i.exec(tokens[tokens.length - 1]);
  if (repsMatch) {
    reps = parseInt(repsMatch[1]);
    wtIdx = tokens.length - 2;
  }
  if (wtIdx < 1) {
    return null;
  }

  const wtMatch = /^(\d+(?:\.\d+)?)(lbs|kg)?$/i.exec(tokens[wtIdx]);
  if (!wtMatch) {
    return null;
  }
  return {
    exercise: tokens.slice(0, wtIdx).join(' '),
    weight: parseFloat(wtMatch[1]),
    unit: wtMatch[2],
    reps,
  };
}

function buildResult(
  exName: string,
  wtLbs: number,
  unit: string | undefined,
  reps: number,
  sets: number,
  rpe: number | null,
  now: Date
): [ParsedExercise, ParsedSession] | null {
  if (!exName.trim() || isNaN(wtLbs) || reps <= 0) {
    return null;
  }
  const finalUnit = (unit?.toLowerCase() === 'kg' ? 'kg' : 'lbs') as LiftUnits;
  const e1rm = calcE1RM(finalUnit === 'lbs' ? wtLbs * 0.453592 : wtLbs, reps, rpe);

  return [
    { type: classifyExerciseName(exName).type, displayName: exName },
    { date: now, weight: wtLbs, reps, sets, unit: finalUnit, e1rm, rpe },
  ];
}
