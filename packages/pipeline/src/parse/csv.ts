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
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export const csvParser: Parser = {
  id: 'csv',

  canParse(input: RawInput): boolean {
    return input.name.endsWith('.csv');
  },

  parse(input: RawInput, ctx: ParseContext): SetRecord[] {
    const lines = input.content.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      throw new ParseError('Empty CSV file');
    }

    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    const requiredFields = ['Date', 'Exercise', 'Reps', 'Weight'];
    const headerMap = new Map<string, number>();
    headers.forEach((h, i) => {
      headerMap.set(h.toLowerCase(), i);
    });

    // Check for required fields
    for (const field of requiredFields) {
      if (!headerMap.has(field.toLowerCase())) {
        throw new ParseError(`Missing required column: ${field}`, 1, headerLine);
      }
    }

    // Detect header-based unit
    const weightHeaderIndex = headerMap.get('weight');
    const weightHeader = weightHeaderIndex !== undefined ? headers[weightHeaderIndex] : undefined;
    const headerUnit = weightHeader ? extractUnitFromHeader(weightHeader) : undefined;

    // Check for unit column
    const unitColumnIndex = headerMap.get('unit');
    const hasUnitColumn = unitColumnIndex !== undefined;

    // Set dataset unit if header indicates it
    const datasetUnit = headerUnit;
    const effectiveCtx: ParseContext = {
      ...ctx,
      datasetUnit: datasetUnit ?? ctx.datasetUnit,
    };

    const records: SetRecord[] = [];

    for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
      const rawLine = lines[lineIdx];
      const values = parseCSVLine(rawLine);

      if (values.length === 0 || (values.length === 1 && values[0] === '')) {
        continue;
      }

      if (values.length < requiredFields.length) {
        throw new ParseError(`Row has fewer columns than header`, lineIdx + 1, rawLine);
      }

      try {
        const dateIndex = headerMap.get('date')!;
        const exerciseIndex = headerMap.get('exercise')!;
        const repsIndex = headerMap.get('reps')!;
        const weightIndex = headerMap.get('weight')!;
        const rpeIndex = headerMap.get('rpe');

        const dateStr = values[dateIndex];
        const exercise = values[exerciseIndex];
        const repsStr = values[repsIndex];
        const weightStr = values[weightIndex];

        if (!dateStr || !exercise || !repsStr || !weightStr) {
          throw new ParseError('Missing required field in row', lineIdx + 1, rawLine);
        }

        const date = parseDate(dateStr);
        const reps = parseFloat_(repsStr);
        if (reps === null) {
          throw new ParseError(`Invalid reps: ${repsStr}`, lineIdx + 1, rawLine);
        }

        // Determine weight and unit
        let weight: number | null = null;
        let recordUnit: Unit | undefined;
        const rawWeight = weightStr;

        // Check for cell-suffix unit first
        const cellUnit = extractUnitFromCell(weightStr);
        if (cellUnit) {
          weight = cellUnit.weight;
          recordUnit = cellUnit.unit;
        } else {
          // Parse as plain number
          weight = parseFloat_(weightStr);
          if (weight === null) {
            throw new ParseError(`Invalid weight: ${weightStr}`, lineIdx + 1, rawLine);
          }

          // Check for unit column override
          if (hasUnitColumn) {
            const unitStr = values[unitColumnIndex!];
            if (unitStr && (unitStr === 'kg' || unitStr === 'lbs')) {
              recordUnit = unitStr as Unit;
            }
          }
        }

        const finalUnit = resolveUnit(recordUnit, effectiveCtx);
        const weightKg = convertToKg(weight, finalUnit);

        const rpe = rpeIndex !== undefined ? parseFloat_(values[rpeIndex]) : undefined;

        const record: SetRecord = {
          date,
          exercise,
          weight: weightKg,
          reps,
          rpe: rpe ?? undefined,
          meta: {
            rawUnit: finalUnit,
            rawWeight: rawWeight,
          },
        };

        records.push(record);
      } catch (err) {
        if (err instanceof ParseError) {
          throw err;
        }
        throw new ParseError(
          err instanceof Error ? err.message : String(err),
          lineIdx + 1,
          rawLine
        );
      }
    }

    return records;
  },
};
