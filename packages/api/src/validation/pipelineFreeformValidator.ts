import { classifyExerciseName } from './classifyExerciseName';

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

const MAX_ERRS = 10;
const emptyTypes = () => ({ squat: 0, bench: 0, deadlift: 0, accessory: 0 });

export function validateTextData(text: string): TextValidationResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('units:'));

  if (!lines.length) {
    return {
      verdict: 'error',
      rows: { total: 0, parsed: 0, liftTypes: emptyTypes() },
      warnings: [],
      rowIssues: [],
      issues: [
        'No text provided. Each line must start with a date in YYYY-MM-DD format, followed by exercise name and weight/reps, e.g. "2024-01-15 comp squat 405lbs x2".',
      ],
    };
  }

  const liftTypes = emptyTypes();
  const rowIssues: TextValidationIssue[] = [];
  let parsed = 0;
  let failed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})\s+(\S.*)$/);

    if (!dateMatch) {
      failed++;
      if (rowIssues.length < MAX_ERRS) {
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

    const tokens = dateMatch[2].split(/\s+/);
    let exerciseName = '';

    for (let j = 0; j < tokens.length; j++) {
      const suffix = tokens.slice(j).join(' ');
      if (/^[\d.]+/.test(suffix) || /^(1?rm|1rM|x\d|@|\d+x)/.test(suffix.toLowerCase())) {
        exerciseName = tokens.slice(0, j).join(' ');
        break;
      }
    }

    if (!exerciseName) {
      failed++;
      if (rowIssues.length < MAX_ERRS) {
        rowIssues.push({
          row: lineNum,
          exercise: '(unparsed)',
          issues: ['Could not find exercise name or weight/reps spec in line'],
        });
      }
      continue;
    }

    parsed++;
    const classified = classifyExerciseName(exerciseName);
    if (!classified.isUnknown) {
      liftTypes[classified.type] += 1;
    }
  }

  const total = lines.length;
  const issues: string[] = [];
  const warnings: string[] = [];

  if (parsed === 0) {
    issues.push(
      `None of the ${total} line${total === 1 ? '' : 's'} could be parsed. Each line must start with YYYY-MM-DD date, e.g. "2024-01-15 comp squat 405lbs x2". See line issues below.`
    );
  } else if (failed > 0) {
    warnings.push(
      `${failed} of ${total} line${failed === 1 ? '' : 's'} couldn't be parsed and will be skipped.`
    );
    if (failed > MAX_ERRS) {
      warnings.push(`Showing the first ${MAX_ERRS} line errors — fix these and re-validate.`);
    }
  }

  if (parsed > 0 && !liftTypes.squat && !liftTypes.bench && !liftTypes.deadlift) {
    warnings.push(
      'No squat, bench, or deadlift exercises were recognized — only accessories. Check exercise naming rules in the onboarding guide.'
    );
  }

  return {
    verdict: issues.length > 0 || parsed === 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok',
    rows: { total, parsed, liftTypes },
    issues,
    warnings,
    rowIssues,
  };
}
