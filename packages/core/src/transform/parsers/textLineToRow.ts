import type { RawRow } from '../../types/RawRow';
import { REP_MAX_TOKEN_SRC } from './repMaxToken';

const REP_MAX_LINE_RE = new RegExp(
  `^(.+?)\\s+${REP_MAX_TOKEN_SRC}\\s+(\\d+(?:\\.\\d+)?)\\s*(lbs|kg)?$`,
  'i'
);
const PLAIN_LINE_RE = /^(.+?)\s+(\d+(?:\.\d+)?)\s*(lbs|kg)?(?:\s*x\s*(\d+))?$/i;

/**
 * Adapts a single pasted text line into a `RawRow` using the same column-key convention as
 * the CSV pipeline (unit lives in the key, e.g. `"1rm (kg)"` / `"weight (lbs)"`), so all of
 * `findRepMaxCols`, `detectWeightUnit`, `parseSessions`, and `nameToExercise` can be reused
 * unchanged. Tries the rep-max grammar (`"<exercise> <N>rm <weight><unit>"`) first, then falls
 * back to the plain weight/reps grammar (`"<exercise> <weight><unit> x<reps>"`, reps optional).
 */
export function textLineToRow(line: string): RawRow | null {
  const trimmed = line.trim();

  const repMax = REP_MAX_LINE_RE.exec(trimmed);
  if (repMax) {
    const [, exercise, reps, weight, unit] = repMax;
    const key = unit ? `${reps}rm (${unit.toLowerCase()})` : `${reps}rm`;
    return { exercise: exercise.trim(), [key]: weight };
  }

  const plain = PLAIN_LINE_RE.exec(trimmed);
  if (plain) {
    const [, exercise, weight, unit, reps] = plain;
    const key = unit ? `weight (${unit.toLowerCase()})` : 'weight';
    return {
      exercise: exercise.trim(),
      [key]: weight,
      ...(reps ? { reps } : {}),
    };
  }

  return null;
}
