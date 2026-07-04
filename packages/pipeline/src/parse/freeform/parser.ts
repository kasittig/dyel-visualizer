import type { RawInput, Parser, ParseContext } from '../parser';
import { ParseError, resolveUnit } from '../parser';
import type { SetRecord, Unit } from '../../types';
import { tokenize, TokenizerError } from './tokenizer';

function convertToKg(weight: number, unit: Unit): number {
  return unit === 'lbs' ? weight * 0.453592 : weight;
}

function parseDate(dateStr: string): number {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date.setHours(0, 0, 0, 0);
}

export const freeformParser: Parser = {
  id: 'freeform',

  canParse: (input: RawInput): boolean => {
    return input.name.endsWith('.txt') || input.content.includes('units:');
  },

  parse(input: RawInput, ctx: ParseContext): SetRecord[] {
    const lines = input.content.split('\n');
    const records: SetRecord[] = [];
    const effectiveCtx: ParseContext = { ...ctx };

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const rawLine = lines[lineNum];
      const line = rawLine.trim();

      // Skip empty lines
      if (!line) {
        continue;
      }

      // Check for preamble with units declaration
      let lineToProcess = line;
      if (line.startsWith('units:')) {
        const match = line.match(/^units:\s*(kg|lbs)(.*)$/i);
        if (match) {
          effectiveCtx.datasetUnit = match[1].toLowerCase() as Unit;
          lineToProcess = match[2].trim();
        } else {
          continue; // Just a units declaration line with nothing after it
        }
        if (!lineToProcess) {
          continue; // Nothing after the units declaration
        }
      }

      // Parse the line: DATE EXERCISE_NAME WEIGHT_REPS_SPECIFICATION
      // Date format: YYYY-MM-DD
      const dateMatch = lineToProcess.match(/^(\d{4}-\d{2}-\d{2})\s+(\S.*)$/);
      if (!dateMatch) {
        throw new ParseError(
          `Invalid line format: expected DATE EXERCISE_NAME WEIGHT_REPS, got: ${lineToProcess}`,
          lineNum + 1,
          rawLine
        );
      }

      const dateStr = dateMatch[1];
      const restOfLine = dateMatch[2];

      let date: number;
      try {
        date = parseDate(dateStr);
      } catch {
        throw new ParseError(`Invalid date: ${dateStr}`, lineNum + 1, rawLine);
      }

      // Split the rest into exercise name and weight/reps specification
      // Work backwards from the end: the weight/reps spec is at the end
      const tokens = restOfLine.split(/\s+/);
      let exerciseTokens: string[] = [];
      let weightRecsSpec: string | null = null;

      // Try successively longer suffixes until tokenization succeeds
      for (let suffixLen = 1; suffixLen <= tokens.length; suffixLen++) {
        const suffix = tokens.slice(tokens.length - suffixLen).join(' ');
        try {
          tokenize(suffix);
          // Successfully tokenized!
          exerciseTokens = tokens.slice(0, tokens.length - suffixLen);
          weightRecsSpec = suffix;
          break;
        } catch {
          // This suffix didn't work, try a longer one
        }
      }

      if (weightRecsSpec === null) {
        throw new ParseError(
          `No valid weight/reps specification found in line: ${line}`,
          lineNum + 1,
          rawLine
        );
      }

      const exercise = exerciseTokens.join(' ');
      if (!exercise) {
        throw new ParseError(`No exercise name found in line: ${line}`, lineNum + 1, rawLine);
      }

      let tokenOutput;
      try {
        tokenOutput = tokenize(weightRecsSpec!);
      } catch (err) {
        const errorMsg = err instanceof TokenizerError ? err.message : 'Unknown tokenizer error';
        throw new ParseError(errorMsg, lineNum + 1, rawLine);
      }

      // Process each weight in the weights array
      for (const weightInfo of tokenOutput.weights) {
        const recordUnit = weightInfo.unit;
        const finalUnit = resolveUnit(recordUnit, effectiveCtx);
        const weightKg = convertToKg(weightInfo.value, finalUnit);

        const record: SetRecord = {
          date,
          exercise,
          weight: weightKg,
          reps: tokenOutput.reps,
          rpe: tokenOutput.rpe,
          meta: {
            rawUnit: finalUnit,
            rawWeight: `${weightInfo.value}${weightInfo.unit || ''}`,
            line: rawLine,
          },
        };

        records.push(record);
      }
    }

    return records;
  },
};
