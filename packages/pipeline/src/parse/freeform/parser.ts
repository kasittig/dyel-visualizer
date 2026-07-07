import type { RawInput, Parser, ParseContext } from '../parser';
import { ParseError, resolveUnit } from '../parser';
import type { SetRecord, Unit } from '../../types';
import { tokenize, TokenizerError } from './tokenizer';

const convertToKg = (w: number, u: Unit) => (u === 'lbs' ? w * 0.453592 : w);

function parseDate(dateStr: string, lineNum: number, rawLine: string): number {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    throw new ParseError(`Invalid date: ${dateStr}`, lineNum, rawLine);
  }
  return date.setHours(0, 0, 0, 0);
}

export function parseFreeformText(content: string, ctx: ParseContext): SetRecord[] {
  const records: SetRecord[] = [];
  const effectiveCtx = { ...ctx };

  content.split('\n').forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    let line = rawLine.trim();
    if (!line) {
      return;
    }

    // Handle inline context units prefix
    const unitMatch = line.match(/^units:\s*(kg|lbs)(.*)$/i);
    if (unitMatch) {
      effectiveCtx.datasetUnit = unitMatch[1].toLowerCase() as Unit;
      line = unitMatch[2].trim();
    } else if (line.startsWith('units:')) {
      return;
    }
    if (!line) {
      return;
    }

    // Extract date and the remaining instruction string
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})\s+(\S.*)$/);
    if (!dateMatch) {
      throw new ParseError(
        `Invalid line format: expected DATE EXERCISE_NAME WEIGHT_REPS, got: ${line}`,
        lineNum,
        rawLine
      );
    }

    const date = parseDate(dateMatch[1], lineNum, rawLine);
    const tokens = dateMatch[2].split(/\s+/);
    let weightSpec = '';

    // Backwards tokenization scan loop
    for (let i = tokens.length - 1; i >= 0; i--) {
      const suffix = tokens.slice(i).join(' ');
      try {
        tokenize(suffix);
        weightSpec = suffix;
        tokens.splice(i); // Truncates tokens array down to just the exercise name
        break;
      } catch (err) {
        // Only swallow tokenization failures; propagate critical engine bugs
        if (!(err instanceof TokenizerError)) {
          throw err;
        }
      }
    }

    const exercise = tokens.join(' ');
    if (!weightSpec) {
      throw new ParseError(
        `No valid weight/reps specification found in line: ${line}`,
        lineNum,
        rawLine
      );
    }
    if (!exercise) {
      throw new ParseError(`No exercise name found in line: ${line}`, lineNum, rawLine);
    }

    try {
      const spec = tokenize(weightSpec);
      spec.weights.forEach(({ value, unit }) => {
        const finalUnit = resolveUnit(unit, effectiveCtx);
        records.push({
          date,
          exercise,
          weight: convertToKg(value, finalUnit),
          reps: spec.reps,
          rpe: spec.rpe,
          meta: { rawUnit: finalUnit, rawWeight: `${value}${unit || ''}`, line: rawLine },
        });
      });
    } catch (err) {
      throw new ParseError(
        err instanceof TokenizerError ? err.message : 'Unknown tokenizer error',
        lineNum,
        rawLine
      );
    }
  });

  return records;
}

export const freeformParser: Parser = {
  id: 'freeform',
  canParse: (input: RawInput) => input.name.endsWith('.txt') || input.content.includes('units:'),
  parse: (input, ctx) => parseFreeformText(input.content, ctx),
};
