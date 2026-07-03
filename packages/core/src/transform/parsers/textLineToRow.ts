import type { RawRow } from '../../types/RawRow';
import { extractDateToken } from './dateToken';

const WEIGHT_TOKEN_RE = /^(\d+(?:\.\d+)?)(lbs|kg)?$/i;
const REPS_TOKEN_RE = /^x(\d+)$/i;
const SETS_REPS_TOKEN_RE = /^(\d+)x(\d+)$/i;
const REP_MAX_TOKEN_RE = /^(\d+)rm$/i;

/**
 * Adapts a single pasted text line into a `RawRow` using the same column-key convention as
 * the CSV pipeline (unit lives in the key, e.g. `"weight (lbs)"`), so `detectWeightUnit`,
 * `nameToExercise`, and `parseSession` can be reused unchanged. First extracts an optional
 * date token (anywhere in the line, via `extractDateToken`) into the `date` key
 * `parseSessionDate` already reads, then tries the rep-max grammar
 * (`"<exercise> <N>rm <weight><unit>"`), then the sets-by-reps grammar
 * (`"<exercise> [-] <sets>x<reps> @ <weight><unit>"`), falling back to the plain weight/reps
 * grammar (`"<exercise> <weight><unit> x<reps>"`, reps optional).
 *
 * Tokenizes on whitespace and matches each token individually (rather than one regex over the
 * whole line) to avoid catastrophic backtracking on inputs with long runs of whitespace.
 */
export function textLineToRow(line: string): RawRow | null {
  const { dateStr, remainder } = extractDateToken(line);
  const dateField: RawRow = dateStr ? { date: dateStr } : {};
  const tokens = remainder.trim().split(/\s+/);
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
      const key = unit ? `weight (${unit.toLowerCase()})` : 'weight';
      return { exercise, [key]: weight, reps, ...dateField };
    }
  }

  if (tokens.length >= 4) {
    const last = tokens.length - 1;
    const setsRepsMatch = SETS_REPS_TOKEN_RE.exec(tokens[last - 2]);
    const weightMatch = WEIGHT_TOKEN_RE.exec(tokens[last]);
    if (setsRepsMatch && tokens[last - 1] === '@' && weightMatch) {
      const exerciseEnd = tokens[last - 3] === '-' ? last - 3 : last - 2;
      const exercise = tokens.slice(0, exerciseEnd).join(' ');
      const [, sets, reps] = setsRepsMatch;
      const [, weight, unit] = weightMatch;
      const key = unit ? `weight (${unit.toLowerCase()})` : 'weight';
      return { exercise, [key]: weight, reps, sets, ...dateField };
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
    ...dateField,
  };
}
