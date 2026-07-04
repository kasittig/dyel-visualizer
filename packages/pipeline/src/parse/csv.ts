import type { RawInput, Parser, ParseContext } from './parser';
import { ParseError, resolveUnit } from './parser';
import type { SetRecord, Unit } from '../types';

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

function parseFloat_(value: string): number | null {
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function extractUnitFromHeader(header: string): Unit | undefined {
  const match = header.match(/\((kg|lbs)\)$/);
  return match ? (match[1] as Unit) : undefined;
}

function extractUnitFromCell(value: string): { weight: number; unit: Unit } | null {
  const match = value.match(/^([\d.]+)(kg|lbs)$/);
  if (match) {
    const weight = parseFloat_(match[1]);
    const unit = match[2] as Unit;
    return weight !== null ? { weight, unit } : null;
  }
  return null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '',
    inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += '"'; // Keep all quotes to process escapes together later
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/""/g, '"').trim());
      current = '';
    } else {
      current += char;
    }
  }
  return [...result, current.replace(/""/g, '"').trim()];
}

export const csvParser: Parser = {
  id: 'csv',
  canParse: (input: RawInput): boolean => input.name.endsWith('.csv'),

  parse(input: RawInput, ctx: ParseContext): SetRecord[] {
    const lines = input.content.split('\n').filter((l) => l.trim());
    if (!lines.length) {
      throw new ParseError('Empty CSV file');
    }

    const headers = parseCSVLine(lines[0]);
    const headerMap = new Map(headers.map((h, i) => [h.toLowerCase(), i]));

    // Quick structural checks
    for (const field of ['Date', 'Exercise', 'Reps', 'Weight']) {
      if (!headerMap.has(field.toLowerCase())) {
        throw new ParseError(`Missing required column: ${field}`, 1, lines[0]);
      }
    }

    const indices = {
      date: headerMap.get('date')!,
      exercise: headerMap.get('exercise')!,
      reps: headerMap.get('reps')!,
      weight: headerMap.get('weight')!,
      rpe: headerMap.get('rpe'),
      unit: headerMap.get('unit'),
    };

    const weightHeader = headers[indices.weight];
    const effectiveCtx = {
      ...ctx,
      datasetUnit: extractUnitFromHeader(weightHeader) ?? ctx.datasetUnit,
    };

    return lines.slice(1).reduce<SetRecord[]>((records, rawLine, idx) => {
      const values = parseCSVLine(rawLine);
      const lineNum = idx + 2;

      if (!values.length || (values.length === 1 && !values[0])) {
        return records;
      }
      if (values.length < 4) {
        throw new ParseError('Row has fewer columns than header', lineNum, rawLine);
      }

      try {
        const [dateStr, exercise, repsStr, weightStr] = [
          values[indices.date],
          values[indices.exercise],
          values[indices.reps],
          values[indices.weight],
        ];

        if (!dateStr || !exercise || !repsStr || !weightStr) {
          throw new ParseError('Missing required field in row', lineNum, rawLine);
        }

        const reps = parseFloat_(repsStr);
        if (reps === null) {
          throw new ParseError(`Invalid reps: ${repsStr}`, lineNum, rawLine);
        }

        let weight: number | null = null;
        let recordUnit: Unit | undefined;

        const cellUnit = extractUnitFromCell(weightStr);
        if (cellUnit) {
          ({ weight, unit: recordUnit } = cellUnit);
        } else {
          weight = parseFloat_(weightStr);
          if (weight === null) {
            throw new ParseError(`Invalid weight: ${weightStr}`, lineNum, rawLine);
          }

          const unitStr = indices.unit !== undefined ? values[indices.unit] : undefined;
          if (unitStr === 'kg' || unitStr === 'lbs') {
            recordUnit = unitStr;
          }
        }

        const finalUnit = resolveUnit(recordUnit, effectiveCtx);
        const rpeVal = indices.rpe !== undefined ? parseFloat_(values[indices.rpe]) : null;

        records.push({
          date: parseDate(dateStr),
          exercise,
          weight: convertToKg(weight, finalUnit),
          reps,
          rpe: rpeVal ?? undefined,
          meta: { rawUnit: finalUnit, rawWeight: weightStr },
        });
      } catch (err) {
        if (err instanceof ParseError) {
          throw err;
        }
        throw new ParseError(err instanceof Error ? err.message : String(err), lineNum, rawLine);
      }

      return records;
    }, []);
  },
};
