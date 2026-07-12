import Papa from 'papaparse';
import { classifyExerciseName } from './classifyExerciseName';

export interface SheetValidationIssue {
  row: number;
  exercise: string;
  issues: string[];
}
export interface ColumnInfo {
  hasExercise: boolean;
  hasDate: boolean;
  hasWeight: boolean;
  hasReps: boolean;
  hasSets: boolean;
  weightUnit: 'lbs' | 'kg' | null;
}
export interface SheetValidationResult {
  verdict: 'ok' | 'warning' | 'error';
  headerRow: number | null;
  columns: ColumnInfo;
  rows: {
    total: number;
    parsed: number;
    liftTypes: { squat: number; bench: number; deadlift: number; accessory: number };
  };
  issues: string[];
  warnings: string[];
  rowIssues: SheetValidationIssue[];
}

const MAX_ROW_ISSUES = 10;
const emptyColumns: ColumnInfo = {
  hasExercise: false,
  hasDate: false,
  hasWeight: false,
  hasReps: false,
  hasSets: false,
  weightUnit: null,
};
const emptyLiftTypes = () => ({ squat: 0, bench: 0, deadlift: 0, accessory: 0 });

export function validateSheetCsv(csv: string): SheetValidationResult {
  const { data, meta } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
  });

  if (!meta.fields || data.length === 0) {
    return {
      verdict: 'error',
      headerRow: null,
      columns: emptyColumns,
      rows: { total: 0, parsed: 0, liftTypes: emptyLiftTypes() },
      issues: [
        "No header row found. Add a row with an 'exercise' column (and 'date', 'weight', 'reps').",
      ],
      warnings: [],
      rowIssues: [],
    };
  }

  const hMap = new Map(meta.fields.map((h) => [h.toLowerCase(), h]));
  const findH = (f: string) => {
    return Array.from(hMap.entries()).find(([k]) => k.startsWith(f.toLowerCase()))?.[1];
  };

  const hasExercise = !!findH('exercise');
  const hasDate = !!findH('date');
  const hasWeight = !!findH('weight');
  const hasReps = !!findH('reps');
  const hasSets = !!findH('sets');

  const detectedUnit = (findH('weight') || '').match(/\((kg|lbs)\)$/)?.[1];
  const columns: ColumnInfo = {
    hasExercise,
    hasDate,
    hasWeight,
    hasReps,
    hasSets,
    weightUnit: detectedUnit === 'kg' ? 'kg' : detectedUnit === 'lbs' ? 'lbs' : null,
  };

  const issues: string[] = [];
  const warnings: string[] = [];

  if (!hasExercise) {
    issues.push("Missing required column: 'exercise'");
  }
  if (!hasDate) {
    warnings.push("Missing column: 'date'. All sessions will be assigned today's date.");
  }
  if (!hasWeight) {
    issues.push("Missing required column: 'weight' — add a 'weight (lbs)'/'weight (kg)' column");
  }
  if (!hasReps) {
    warnings.push("Missing column: 'reps'. Assuming one rep performed for all exercises.");
  }

  if (issues.length > 0) {
    return {
      verdict: 'error',
      headerRow: 0,
      columns,
      rows: { total: 0, parsed: 0, liftTypes: emptyLiftTypes() },
      issues,
      warnings,
      rowIssues: [],
    };
  }

  if (columns.weightUnit === null) {
    warnings.push(
      "Weight column has no unit — rename it to 'weight (lbs)' or 'weight (kg)' to be explicit. The app currently assumes lbs."
    );
  }

  const liftTypes = emptyLiftTypes();
  const rowIssues: SheetValidationIssue[] = [];
  let numParsed = 0;
  let rowsFullyFailed = 0;
  const exerciseKey = findH('exercise');
  const weightKey = findH('weight');
  const repsKey = findH('reps');
  const dateKey = findH('date');
  const rpeKey = findH('rpe');

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;
    const exerciseName = exerciseKey ? row[exerciseKey]?.trim() : '';
    const rowProblems: string[] = [];
    const rowWarnings: string[] = [];

    // Exercise validation
    if (!exerciseName) {
      rowProblems.push('Exercise name is empty');
    }

    // Weight validation
    const weightStr = weightKey ? row[weightKey]?.trim() : '';
    if (!weightStr) {
      rowProblems.push('Weight is missing');
    } else {
      const weight = parseFloat(weightStr);
      if (isNaN(weight)) {
        rowProblems.push(`Invalid weight: "${weightStr}" (must be a number)`);
      }
    }

    // Reps validation
    const repsStr = repsKey ? row[repsKey]?.trim() : '';
    if (!repsStr) {
      rowWarnings.push('Reps is missing. Will assume 1 rep was performed');
    } else {
      const reps = parseFloat(repsStr);
      if (isNaN(reps) || !Number.isInteger(reps) || reps <= 0) {
        rowProblems.push(`Invalid reps: "${repsStr}" (must be a positive whole number)`);
      }
    }

    // Date validation
    const dateStr = dateKey ? row[dateKey]?.trim() : '';
    if (!dateStr) {
      rowWarnings.push('Date is missing');
    } else if (isNaN(new Date(dateStr).getTime())) {
      rowProblems.push(`Invalid date: "${dateStr}"`);
    }

    // RPE validation (optional)
    const rpeStr = rpeKey ? row[rpeKey]?.trim() : '';
    if (rpeStr) {
      const rpeVal = parseFloat(rpeStr);
      if (isNaN(rpeVal) || rpeVal < 1 || rpeVal > 10) {
        rowWarnings.push(`Invalid RPE: "${rpeStr}" (must be a number between 1 and 10)`);
      }
    }

    // Accumulate issues and decide row fate
    if (rowProblems.length > 0) {
      rowsFullyFailed++;
      if (rowIssues.length < MAX_ROW_ISSUES) {
        rowIssues.push({ row: rowNum, exercise: exerciseName || '(empty)', issues: rowProblems });
      }
    } else {
      if (rowWarnings.length > 0 && rowIssues.length < MAX_ROW_ISSUES) {
        rowIssues.push({ row: rowNum, exercise: exerciseName, issues: rowWarnings });
      }
      numParsed++;
      const classified = classifyExerciseName(exerciseName);
      if (!classified.isUnknown) {
        liftTypes[classified.type] += 1;
      }
    }
  }

  const total = data.length;
  if (numParsed === 0 && total > 0) {
    issues.push(
      `None of the ${total} data row${total === 1 ? '' : 's'} could be parsed. See row issues below.`
    );
  } else if (rowsFullyFailed > 0) {
    warnings.push(
      `${rowsFullyFailed} of ${total} row${rowsFullyFailed === 1 ? '' : 's'} couldn't be parsed and will be skipped.`
    );
    if (rowsFullyFailed > MAX_ROW_ISSUES) {
      warnings.push(`Showing the first ${MAX_ROW_ISSUES} row errors — fix these and re-validate.`);
    }
  }

  if (numParsed > 0 && !liftTypes.squat && !liftTypes.bench && !liftTypes.deadlift) {
    warnings.push(
      'No squat, bench, or deadlift exercises were recognized — only accessories. Check exercise naming rules in the onboarding guide.'
    );
  }

  return {
    verdict:
      issues.length > 0 || numParsed === 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok',
    headerRow: 0,
    columns,
    rows: { total, parsed: numParsed, liftTypes },
    issues,
    warnings,
    rowIssues,
  };
}
