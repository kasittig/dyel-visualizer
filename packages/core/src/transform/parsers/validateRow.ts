import type { RawRow } from '../../types/RawRow';
import { findCol } from './findCol';
import { findRepMaxCols } from './findRepMaxCols';

export interface RowValidation {
  problems: string[];
  warnings: string[];
  sessionsInRow: number;
}

/**
 * Weight/reps/rep-max/RPE checks shared by `validateSheetCsv.ts` and `validateTextData.ts`.
 * Exercise-name-emptiness and date-string validity are left to each caller since CSV and text
 * sources diverge there (CSV's raw `date` cell needs its own `isNaN(new Date(...))` check;
 * text's `date`, when present, was already normalized by `textLineToRow`/`extractDateToken`).
 */
export function validateRow(row: RawRow): RowValidation {
  const problems: string[] = [];
  const warnings: string[] = [];
  let sessionsInRow = 0;

  const repMaxCols = findRepMaxCols(row);

  if (repMaxCols.length > 0) {
    for (const { reps, value } of repMaxCols) {
      const trimmed = value.trim();
      if (trimmed === '') {
        continue;
      }
      const weight = parseFloat(trimmed);
      if (isNaN(weight)) {
        warnings.push(
          `Invalid ${reps}RM value: "${trimmed}" (must be a number) — this value will be skipped`
        );
      } else {
        sessionsInRow++;
      }
    }
    if (sessionsInRow === 0) {
      problems.push('No valid rep-max values provided');
    }
  } else {
    const weightStr = findCol(row, 'weight') ?? '';
    const weight = parseFloat(weightStr);
    if (!weightStr) {
      problems.push('Weight is missing');
    } else if (isNaN(weight)) {
      problems.push(`Invalid weight: "${weightStr}" (must be a number)`);
    }

    const repsStr = row['reps']?.trim() ?? '';
    const reps = parseInt(repsStr);
    if (!repsStr) {
      warnings.push('Reps is missing. Will assume 1 rep was performed');
    } else if (isNaN(reps) || reps <= 0) {
      problems.push(`Invalid reps: "${repsStr}" (must be a positive whole number)`);
    }

    if (problems.length === 0) {
      sessionsInRow = 1;
    }
  }

  const rpeStr = row['rpe']?.trim() ?? '';
  if (rpeStr) {
    const rpeVal = parseFloat(rpeStr);
    if (isNaN(rpeVal) || rpeVal < 1 || rpeVal > 10) {
      warnings.push(`Invalid RPE: "${rpeStr}" (must be a number between 1 and 10)`);
    }
  }

  return { problems, warnings, sessionsInRow };
}
