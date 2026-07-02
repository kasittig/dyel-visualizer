import type { TextFieldInput } from '../types/TextFieldInput';
import { extractTextLines } from '../extract/textExtract';
import { textLineToRow } from './parsers/textLineToRow';
import { nameToExercise } from './parsers/nameToExercise';
import { validateRow } from './parsers/validateRow';

export interface TextValidationIssue {
  row: number;
  exercise: string;
  issues: string[];
}

export interface TextValidationResult {
  verdict: 'ok' | 'warning' | 'error';
  rows: {
    total: number;
    parsed: number;
    liftTypes: { squat: number; bench: number; deadlift: number; accessory: number };
  };
  issues: string[];
  warnings: string[];
  rowIssues: TextValidationIssue[];
}

const MAX_LINE_ISSUES = 10;

function emptyLiftTypes() {
  return { squat: 0, bench: 0, deadlift: 0, accessory: 0 };
}

export function validateTextData(text: TextFieldInput): TextValidationResult {
  const textLines = extractTextLines(text);

  if (!textLines) {
    return {
      verdict: 'error',
      rows: { total: 0, parsed: 0, liftTypes: emptyLiftTypes() },
      issues: ['No text provided. Paste one exercise per line, e.g. "comp squat 1rm 300lbs".'],
      warnings: [],
      rowIssues: [],
    };
  }

  const issues: string[] = [];
  const warnings: string[] = [];
  const liftTypes = emptyLiftTypes();
  let numParsed = 0;
  let linesFullyFailed = 0;
  const rowIssues: TextValidationIssue[] = [];

  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i];
    const lineNum = i + 1;

    const row = textLineToRow(line);
    if (!row) {
      linesFullyFailed++;
      if (rowIssues.length < MAX_LINE_ISSUES) {
        rowIssues.push({
          row: lineNum,
          exercise: '(unparsed)',
          issues: [
            'Couldn\'t parse this line — expected something like "exercise weight[unit] [xreps]" or "exercise Nrm weight[unit]", with an optional date.',
          ],
        });
      }
      continue;
    }

    const exerciseName = row['exercise']?.trim() ?? '';
    const lineProblems: string[] = [];
    const lineWarnings: string[] = [];

    if (!exerciseName) {
      lineProblems.push('Exercise name is empty');
    }

    const { problems, warnings: rowWarnings, sessionsInRow } = validateRow(row);
    lineProblems.push(...problems);
    lineWarnings.push(...rowWarnings);

    if (lineProblems.length > 0) {
      linesFullyFailed++;
      if (rowIssues.length < MAX_LINE_ISSUES) {
        rowIssues.push({
          row: lineNum,
          exercise: exerciseName || '(empty)',
          issues: lineProblems,
        });
      }
    } else {
      if (lineWarnings.length > 0) {
        rowIssues.push({ row: lineNum, exercise: exerciseName, issues: lineWarnings });
      }
      numParsed += sessionsInRow;
      const ex = nameToExercise(exerciseName);
      if (ex) {
        liftTypes[ex.type] += sessionsInRow;
      }
    }
  }

  const total = textLines.length;

  if (numParsed === 0) {
    issues.push(
      `None of the ${total} line${total === 1 ? '' : 's'} could be parsed. See line issues below.`
    );
  } else if (linesFullyFailed > 0) {
    warnings.push(
      `${linesFullyFailed} of ${total} line${linesFullyFailed === 1 ? '' : 's'} couldn't be parsed and will be skipped.`
    );
    if (linesFullyFailed > MAX_LINE_ISSUES) {
      warnings.push(
        `Showing the first ${MAX_LINE_ISSUES} line errors — fix these and re-validate.`
      );
    }
  }

  if (numParsed > 0 && liftTypes.squat === 0 && liftTypes.bench === 0 && liftTypes.deadlift === 0) {
    warnings.push(
      'No squat, bench, or deadlift exercises were recognized — only accessories. Check exercise naming rules in the onboarding guide.'
    );
  }

  const verdict: 'ok' | 'warning' | 'error' =
    issues.length > 0 || numParsed === 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok';

  return {
    verdict,
    rows: { total, parsed: numParsed, liftTypes },
    issues,
    warnings,
    rowIssues,
  };
}
