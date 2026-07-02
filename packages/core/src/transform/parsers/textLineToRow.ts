import type { RawRow } from '../../types/RawRow';
import { REP_MAX_TOKEN_SRC } from './repMaxToken';

const REP_MAX_TOKEN_RE = new RegExp(`^${REP_MAX_TOKEN_SRC}$`, 'i');
const WEIGHT_TOKEN_RE = /^(\d+(?:\.\d+)?)(lbs|kg)?$/i;
const REPS_TOKEN_RE = /^x(\d+)$/i;

/**
 * Adapts a single pasted text line into a `RawRow` using the same column-key convention as
 * the CSV pipeline (unit lives in the key, e.g. `"1rm (kg)"` / `"weight (lbs)"`), so all of
 * `findRepMaxCols`, `detectWeightUnit`, `parseSessions`, and `nameToExercise` can be reused
 * unchanged. Tries the rep-max grammar (`"<exercise> <N>rm <weight><unit>"`) first, then falls
 * back to the plain weight/reps grammar (`"<exercise> <weight><unit> x<reps>"`, reps optional).
 *
 * Tokenizes on whitespace and matches each token individually (rather than one regex over the
 * whole line) to avoid catastrophic backtracking on inputs with long runs of whitespace.
 */
export function textLineToRow(line: string): RawRow | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 2) {
    return null;
  }

  if (tokens.length >= 3) {
    const repMaxMatch = REP_MAX_TOKEN_RE.exec(tokens[tokens.length - 2]);
    const weightMatch = WEIGHT_TOKEN_RE.exec(tokens[tokens.length - 1]);
    if (repMaxMatch && weightMatch) {
      const exercise = tokens.slice(0, -2).join(' ');
      const [, reps] = repMaxMatch;
      const [, weight, unit] = weightMatch;
      const key = unit ? `${reps}rm (${unit.toLowerCase()})` : `${reps}rm`;
      return { exercise, [key]: weight };
    }
  }

  const repsMatch = REPS_TOKEN_RE.exec(tokens[tokens.length - 1]);
  const weightTokenIdx = repsMatch ? tokens.length - 2 : tokens.length - 1;
  if (weightTokenIdx < 1) {
    return null;
  }
  const weightMatch = WEIGHT_TOKEN_RE.exec(tokens[weightTokenIdx]);
  if (!weightMatch) {
    return null;
  }

  const exercise = tokens.slice(0, weightTokenIdx).join(' ');
  const [, weight, unit] = weightMatch;
  const key = unit ? `weight (${unit.toLowerCase()})` : 'weight';
  return {
    exercise,
    [key]: weight,
    ...(repsMatch ? { reps: repsMatch[1] } : {}),
  };
}
