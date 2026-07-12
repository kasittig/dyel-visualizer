import type { RawInput, Parser, ParseContext } from '../parser';
import { ParseError, resolveUnit } from '../parser';
import type { SetRecord, Unit } from '../../types';
import { tokenize, TokenizerError } from './tokenizer';
import { convertToKg } from '../unitConversion';

function parseDate(dateStr: string, lineNum: number, rawLine: string): number {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    throw new ParseError(`Invalid date: ${dateStr}`, lineNum, rawLine);
  }
  return d.setHours(0, 0, 0, 0);
}

export function parseFreeformText(content: string, ctx: ParseContext): SetRecord[] {
  const records: SetRecord[] = [];
  const effectiveCtx = { ...ctx };
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
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})\s+(\S.*)$/);
    if (!dateMatch) {
      throw new ParseError(`Invalid line format: ${line}`, lineNum, rawLine);
    }
    const date = parseDate(dateMatch[1], lineNum, rawLine);
    const tokens = dateMatch[2].split(/\s+/);
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
