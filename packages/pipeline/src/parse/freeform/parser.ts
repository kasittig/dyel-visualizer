import type { RawInput, Parser, ParseContext } from '../parser';
import { ParseError, resolveUnit } from '../parser';
import type { SetRecord, Unit } from '../../types';
import { tokenize, TokenizerError } from './tokenizer';
import { convertToKg } from '../unitConversion';

function parseDate(dateStr: string, lineNum: number, rawLine: string): number {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new ParseError(`Invalid date: ${dateStr}`, lineNum, rawLine);
  }
  const timestamp = Date.UTC(
    parseInt(match[1], 10),
    parseInt(match[2], 10) - 1,
    parseInt(match[3], 10)
  );
  if (Number.isNaN(timestamp)) {
    throw new ParseError(`Invalid date: ${dateStr}`, lineNum, rawLine);
  }
  return timestamp;
}

export function parseFreeformText(
  content: string,
  ctx: ParseContext,
  defaultDate: number = Date.now()
): SetRecord[] {
  const records: SetRecord[] = [];
  const effectiveCtx = { ...ctx };
  const fallbackDate = new Date(defaultDate);
  content.split('\n').forEach((rawLine: string, idx: number) => {
    const lineNum = idx + 1;
    let line = rawLine.trim();
    if (!line) {
      return;
    }
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
    const tokens = line.split(/\s+/);
    const dateIndex = tokens.findIndex((token) => /^\d{4}-\d{2}-\d{2}$/.test(token));
    const date =
      dateIndex === -1
        ? Date.UTC(
            fallbackDate.getUTCFullYear(),
            fallbackDate.getUTCMonth(),
            fallbackDate.getUTCDate()
          )
        : parseDate(tokens.splice(dateIndex, 1)[0], lineNum, rawLine);
    let weightSpec = '';
    for (let i = tokens.length - 1; i >= 0; i--) {
      const suffix = tokens.slice(i).join(' ');
      try {
        tokenize(suffix);
        weightSpec = suffix;
        tokens.splice(i);
        break;
      } catch (err: unknown) {
        if (!(err instanceof TokenizerError)) {
          throw err;
        }
      }
    }
    if (!weightSpec && /^\d+(?:\.\d+)?(?:lbs|kg)?$/i.test(tokens.at(-1) ?? '')) {
      weightSpec = `${tokens.pop()} x1`;
    }
    const exercise = tokens.join(' ');
    if (!weightSpec) {
      throw new ParseError(`No weight/reps spec: ${line}`, lineNum, rawLine);
    }
    if (!exercise) {
      throw new ParseError(`No exercise: ${line}`, lineNum, rawLine);
    }
    try {
      const spec = tokenize(weightSpec);
      spec.weights.forEach(({ value, unit }: { value: number; unit?: string }) => {
        const finalUnit = resolveUnit(unit as Unit, effectiveCtx);
        records.push({
          date,
          exercise,
          weight: convertToKg(value, finalUnit),
          reps: spec.reps,
          rpe: spec.rpe,
          meta: { rawUnit: finalUnit, rawWeight: `${value}${unit || ''}`, line: rawLine },
        });
      });
    } catch (err: unknown) {
      throw new ParseError(
        err instanceof TokenizerError ? err.message : 'Tokenizer error',
        lineNum,
        rawLine
      );
    }
  });
  return records;
}

export const freeformParser: Parser = {
  id: 'freeform',
  canParse: (input: RawInput): boolean => {
    return input.name.endsWith('.txt') || input.content.includes('units:');
  },
  parse: (input: RawInput, context: ParseContext): SetRecord[] => {
    return parseFreeformText(input.content, context);
  },
};
