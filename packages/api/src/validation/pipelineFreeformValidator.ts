import { parseFreeformTextResult } from '@dyel/pipeline';
import { countHistoryAwareLiftTypes, emptyLiftTypeCounts } from './historyAwareLiftTypes';

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
export function validateTextData(text: string): TextValidationResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((line) => line && !line.toLowerCase().startsWith('units:'));

  if (!lines.length) {
    return {
      verdict: 'error',
      rows: { total: 0, parsed: 0, liftTypes: emptyLiftTypeCounts() },
      warnings: [],
      rowIssues: [],
      issues: ['No text provided. Add one exercise per line, e.g. "comp squat 405lbs x2".'],
    };
  }

  const parsedResult = parseFreeformTextResult(text, { fallback: 'lbs' });
  const liftTypes = countHistoryAwareLiftTypes(parsedResult.records);

  const total = lines.length;
  const failed = parsedResult.errors.length;
  const parsed = total - failed;
  const issues: string[] = [];
  const warnings: string[] = [];
  const rowIssues = parsedResult.errors.slice(0, MAX_ERRS).map((error) => ({
    row: error.line ?? 0,
    exercise: '(unparsed)',
    issues: [error.message],
  }));

  if (parsed === 0) {
    issues.push(
      `None of the ${total} line${total === 1 ? '' : 's'} could be parsed. See line issues below.`
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
