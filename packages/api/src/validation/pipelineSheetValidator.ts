import Papa from 'papaparse';
import type { SetRecord } from '@dyel/pipeline';
import { countHistoryAwareLiftTypes, emptyLiftTypeCounts } from './historyAwareLiftTypes';

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
const emptyCols = (): ColumnInfo => ({
  hasExercise: false,
  hasDate: false,
  hasWeight: false,
  hasReps: false,
  hasSets: false,
  weightUnit: null,
});
function findHeaderLineIndex(lines: string[]): number {
  return lines.findIndex(
    (l) => l.trim() && l.split(',').some((c) => c.trim().toLowerCase().startsWith('exercise'))
  );
}

export function validateSheetCsv(csv: string): SheetValidationResult {
  const lines = csv.split('\n');
  const headIdx = findHeaderLineIndex(lines);
  const { data, meta } = Papa.parse<Record<string, string>>(
    headIdx === -1 ? csv : lines.slice(headIdx).join('\n'),
    { header: true, skipEmptyLines: 'greedy' }
  );

  if (!meta.fields) {
    return {
      verdict: 'error',
      headerRow: null,
      columns: emptyCols(),
      rows: { total: 0, parsed: 0, liftTypes: emptyLiftTypeCounts() },
      issues: [
        "No header row found. Add a row with an 'exercise' column (and 'date', 'weight', 'reps').",
      ],
      warnings: [],
      rowIssues: [],
    };
  }

  if (!data.length) {
    return {
      verdict: 'error',
      headerRow: null,
      columns: emptyCols(),
      rows: { total: 0, parsed: 0, liftTypes: emptyLiftTypeCounts() },
      issues: ['No data rows found. Add at least one row of exercise data.'],
      warnings: [],
      rowIssues: [],
    };
  }

  const hMap = new Map(meta.fields.map((h) => [h.toLowerCase(), h]));
  const findH = (f: string) =>
    [...hMap.entries()].find(([k]) => k.startsWith(f.toLowerCase()))?.[1];

  const [exKey, wtKey, rpKey, dtKey, rpeKey, stKey] = [
    'exercise',
    'weight',
    'reps',
    'date',
    'rpe',
    'sets',
  ].map(findH);
  const unit = (wtKey || '').match(/\((kg|lbs)\)$/)?.[1];
  const columns: ColumnInfo = {
    hasExercise: !!exKey,
    hasDate: !!dtKey,
    hasWeight: !!wtKey,
    hasReps: !!rpKey,
    hasSets: !!stKey,
    weightUnit: unit === 'kg' || unit === 'lbs' ? unit : null,
  };

  const issues: string[] = [],
    warnings: string[] = [];
  if (!exKey) {
    issues.push("Missing required column: 'exercise'");
  }
  if (!dtKey) {
    warnings.push("Missing column: 'date'. All sessions will be assigned today's date.");
  }
  if (!wtKey) {
    issues.push("Missing required column: 'weight' — add a 'weight (lbs)'/'weight (kg)' column");
  }
  if (!rpKey) {
    warnings.push("Missing column: 'reps'. Assuming one rep performed for all exercises.");
  }

  const headerRow = headIdx === -1 ? null : headIdx;
  if (issues.length) {
    return {
      verdict: 'error',
      headerRow,
      columns,
      rows: { total: 0, parsed: 0, liftTypes: emptyLiftTypeCounts() },
      issues,
      warnings,
      rowIssues: [],
    };
  }
  if (!columns.weightUnit) {
    warnings.push(
      "Weight column has no unit — rename it to 'weight (lbs)' or 'weight (kg)' to be explicit. The app currently assumes lbs."
    );
  }

  const validRecords: SetRecord[] = [],
    rowIssues: SheetValidationIssue[] = [];
  let parsed = 0,
    failed = 0;

  data.forEach((row, i) => {
    const name = row[exKey!]?.trim() || '',
      wtStr = row[wtKey!]?.trim() || '',
      rpStr = row[rpKey!]?.trim() || '',
      dtStr = row[dtKey!]?.trim() || '',
      rpeStr = row[rpeKey!]?.trim() || '';
    const bad: string[] = [],
      warn: string[] = [];

    if (!name) {
      bad.push('Exercise name is empty');
    }
    if (!wtStr) {
      bad.push('Weight is missing');
    } else if (isNaN(parseFloat(wtStr))) {
      bad.push(`Invalid weight: "${wtStr}" (must be a number)`);
    }

    if (!rpStr) {
      warn.push('Reps is missing. Will assume 1 rep was performed');
    } else {
      const rp = parseFloat(rpStr);
      if (isNaN(rp) || !Number.isInteger(rp) || rp <= 0) {
        bad.push(`Invalid reps: "${rpStr}" (must be a positive whole number)`);
      }
    }

    if (!dtStr) {
      warn.push('Date is missing');
    } else if (isNaN(new Date(dtStr).getTime())) {
      bad.push(`Invalid date: "${dtStr}"`);
    }
    if (rpeStr) {
      const rpe = parseFloat(rpeStr);
      if (isNaN(rpe) || rpe < 1 || rpe > 10) {
        warn.push(`Invalid RPE: "${rpeStr}" (must be a number between 1 and 10)`);
      }
    }

    if (bad.length) {
      failed++;
      if (rowIssues.length < MAX_ROW_ISSUES) {
        rowIssues.push({ row: i + 1, exercise: name || '(empty)', issues: bad });
      }
    } else {
      if (warn.length && rowIssues.length < MAX_ROW_ISSUES) {
        rowIssues.push({ row: i + 1, exercise: name, issues: warn });
      }
      parsed++;
      validRecords.push({
        date: dtStr ? new Date(dtStr).getTime() : 0,
        exercise: name,
        weight: parseFloat(wtStr),
        reps: rpStr ? parseInt(rpStr, 10) : 1,
        ...(rpeStr ? { rpe: parseFloat(rpeStr) } : {}),
      });
    }
  });

  const total = data.length;
  const liftTypes = countHistoryAwareLiftTypes(validRecords);
  if (!parsed && total) {
    issues.push(
      `None of the ${total} data row${total === 1 ? '' : 's'} could be parsed. See row issues below.`
    );
  } else if (failed) {
    warnings.push(
      `${failed} of ${total} row${failed === 1 ? '' : 's'} couldn't be parsed and will be skipped.`
    );
    if (failed > MAX_ROW_ISSUES) {
      warnings.push(`Showing the first ${MAX_ROW_ISSUES} row errors — fix these and re-validate.`);
    }
  }
  if (parsed && !liftTypes.squat && !liftTypes.bench && !liftTypes.deadlift) {
    warnings.push(
      'No squat, bench, or deadlift exercises were recognized — only accessories. Check exercise naming rules in the onboarding guide.'
    );
  }

  return {
    verdict: issues.length || !parsed ? 'error' : warnings.length ? 'warning' : 'ok',
    headerRow,
    columns,
    rows: { total, parsed, liftTypes },
    issues,
    warnings,
    rowIssues,
  };
}
