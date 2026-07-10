import { classifyExerciseName } from '@dyel/api';

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

export function validateTextData(text: string): TextValidationResult {
  const allLines = text.split('\n');
  const textLines = allLines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('units:'));

  if (!textLines.length) {
    return {
      verdict: 'error',
      rows: { total: 0, parsed: 0, liftTypes: emptyLiftTypes() },
      issues: [
        'No text provided. Each line must start with a date in YYYY-MM-DD format, followed by exercise name and weight/reps, e.g. "2024-01-15 comp squat 405lbs x2".',
      ],
      warnings: [],
      rowIssues: [],
    };
  }

  const liftTypes = emptyLiftTypes();
  let numParsed = 0;
  let linesFailed = 0;
  const rowIssues: TextValidationIssue[] = [];

  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i];
    const lineNum = i + 1;

    // Validate YYYY-MM-DD date format at start of line
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);

    if (!dateMatch) {
      linesFailed++;
      if (rowIssues.length < MAX_LINE_ISSUES) {
        rowIssues.push({
          row: lineNum,
          exercise: '(unparsed)',
          issues: [
            'Line must start with a date in YYYY-MM-DD format, e.g. "2024-01-15 comp squat 405lbs x2"',
          ],
        });
      }
      continue;
    }

    const rest = dateMatch[2];
    const tokens = rest.split(/\s+/);

    // Find exercise name and weight/reps spec boundary
    // Exercise name is tokens before the weight/reps spec starts
    // Weight/reps spec starts with a number or unit: keyword
    let exerciseName = '';
    for (let j = 0; j < tokens.length; j++) {
      const suffix = tokens.slice(j).join(' ');
      // Check if this looks like a weight/reps spec (starts with number or unit keyword like "1rm")
      if (/^[\d.]+/.test(suffix) || /^(1?rm|1rM|x\d|@|\d+x)/.test(suffix.toLowerCase())) {
        exerciseName = tokens.slice(0, j).join(' ');
        break;
      }
    }

    if (!exerciseName) {
      linesFailed++;
      if (rowIssues.length < MAX_LINE_ISSUES) {
        rowIssues.push({
          row: lineNum,
          exercise: '(unparsed)',
          issues: ['Could not find exercise name or weight/reps spec in line'],
        });
      }
      continue;
    }

    numParsed++;
    const classified = classifyExerciseName(exerciseName);
    if (!classified.isUnknown) {
      liftTypes[classified.type] += 1;
    }
  }

  const total = textLines.length;
  const issues: string[] = [];
  const warnings: string[] = [];

  if (numParsed === 0) {
    issues.push(
      `None of the ${total} line${total === 1 ? '' : 's'} could be parsed. Each line must start with YYYY-MM-DD date, e.g. "2024-01-15 comp squat 405lbs x2". See line issues below.`
    );
  } else if (linesFailed > 0) {
    warnings.push(
      `${linesFailed} of ${total} line${linesFailed === 1 ? '' : 's'} couldn't be parsed and will be skipped.`
    );
    if (linesFailed > MAX_LINE_ISSUES) {
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
