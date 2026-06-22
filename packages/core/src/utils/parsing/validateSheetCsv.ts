import { findCol, nameToExercise } from './parseConjugateData';
import { parseSheetRows, detectWeightUnit } from './sheetRows';

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

function emptyLiftTypes() {
  return { squat: 0, bench: 0, deadlift: 0, accessory: 0 };
}

export function validateSheetCsv(csv: string): SheetValidationResult {
  const sheet = parseSheetRows(csv);

  if (!sheet) {
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

  const { headerIdx, rows: data } = sheet;
  const keys = data.length > 0 ? Object.keys(data[0]) : [];

  const hasExercise = keys.includes('exercise');
  const hasDate = keys.includes('date');
  const hasWeight = keys.some((k) => /^weight(\W|$)/.test(k));
  const hasReps = keys.includes('reps');
  const hasSets = keys.some((k) => /^sets(\W|$)/.test(k));
  const weightUnit = detectWeightUnit(keys);

  const columns: ColumnInfo = { hasExercise, hasDate, hasWeight, hasReps, hasSets, weightUnit };

  const issues: string[] = [];
  const warnings: string[] = [];

  if (!hasExercise) {
    issues.push("Missing required column: 'exercise'");
  }
  if (!hasDate) {
    warnings.push("Missing column: 'date'. All sessions will be assigned today's date.");
  }
  if (!hasWeight) {
    issues.push("Missing required column: 'weight' — add a 'weight (lbs)' or 'weight (kg)' column");
  }
  if (!hasReps) {
    issues.push("Missing required column: 'reps'");
  }

  if (issues.length > 0) {
    return {
      verdict: 'error',
      headerRow: headerIdx,
      columns,
      rows: { total: 0, parsed: 0, liftTypes: emptyLiftTypes() },
      issues,
      warnings,
      rowIssues: [],
    };
  }

  if (weightUnit === null) {
    warnings.push(
      "Weight column has no unit — rename it to 'weight (lbs)' or 'weight (kg)' to be explicit. The app currently assumes lbs."
    );
  }

  const liftTypes = emptyLiftTypes();
  let num_parsed = 0;
  const rowIssues: SheetValidationIssue[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const exerciseName = row['exercise']?.trim() ?? '';
    const rowNum = i + 1;
    const rowProblems: string[] = [];
    const rowWarnings: string[] = [];

    if (!exerciseName) {
      rowProblems.push('Exercise name is empty');
    }

    const dateStr = row['date']?.trim() ?? '';
    if (!dateStr) {
      rowWarnings.push('Date is missing');
    } else if (isNaN(new Date(dateStr).getTime())) {
      rowProblems.push(`Invalid date: "${dateStr}"`);
    }

    const weightStr = findCol(row, 'weight') ?? '';
    const weight = parseFloat(weightStr);
    if (!weightStr) {
      rowProblems.push('Weight is missing');
    } else if (isNaN(weight)) {
      rowProblems.push(`Invalid weight: "${weightStr}" (must be a number)`);
    }

    const repsStr = row['reps']?.trim() ?? '';
    const reps = parseInt(repsStr);
    if (!repsStr) {
      rowProblems.push('Reps is missing');
    } else if (isNaN(reps) || reps <= 0) {
      rowProblems.push(`Invalid reps: "${repsStr}" (must be a positive whole number)`);
    }

    const rpeStr = row['rpe']?.trim() ?? '';
    if (rpeStr) {
      const rpeVal = parseFloat(rpeStr);
      if (isNaN(rpeVal) || rpeVal < 1 || rpeVal > 10) {
        rowWarnings.push(`Invalid RPE: "${rpeStr}" (must be a number between 1 and 10)`);
      }
    }

    if (rowProblems.length > 0) {
      if (rowIssues.length < MAX_ROW_ISSUES) {
        rowIssues.push({ row: rowNum, exercise: exerciseName || '(empty)', issues: rowProblems });
      }
    } else {
      if (rowWarnings.length > 0) {
        rowIssues.push({ row: rowNum, exercise: exerciseName, issues: rowWarnings });
      }
      num_parsed++;
      const ex = nameToExercise(exerciseName);
      if (ex) {
        liftTypes[ex.type]++;
      }
    }
  }

  const total = data.length;

  if (total === 0) {
    issues.push('No data rows found in the sheet.');
  } else if (num_parsed === 0) {
    issues.push(
      `None of the ${total} data row${total === 1 ? '' : 's'} could be parsed. See row issues below.`
    );
  } else if (num_parsed < total) {
    const skipped = total - num_parsed;
    warnings.push(
      `${skipped} of ${total} row${skipped === 1 ? '' : 's'} couldn't be parsed and will be skipped.`
    );
    if (total - num_parsed > MAX_ROW_ISSUES) {
      warnings.push(`Showing the first ${MAX_ROW_ISSUES} row errors — fix these and re-validate.`);
    }
  }

  if (
    num_parsed > 0 &&
    liftTypes.squat === 0 &&
    liftTypes.bench === 0 &&
    liftTypes.deadlift === 0
  ) {
    warnings.push(
      'No squat, bench, or deadlift exercises were recognized — only accessories. Check exercise naming rules in the onboarding guide.'
    );
  }

  const verdict: 'ok' | 'warning' | 'error' =
    issues.length > 0 || num_parsed === 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok';

  return {
    verdict,
    headerRow: headerIdx,
    columns,
    rows: { total, parsed: num_parsed, liftTypes },
    issues,
    warnings,
    rowIssues,
  };
}
