import type { RawInput, Parser, ParseContext } from './parser';
import { ParseError, resolveUnit } from './parser';
import type { SetRecord, Unit } from '../types';
import Papa from 'papaparse';

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

export const csvParser: Parser = {
  id: 'csv',
  canParse: (input: RawInput): boolean => input.name.endsWith('.csv'),

  parse(input: RawInput, ctx: ParseContext): SetRecord[] {
    // PapaParse handles cross-platform line breaks and quotes automatically
    const { data, meta } = Papa.parse<Record<string, string>>(input.content, {
      header: true,
      skipEmptyLines: 'greedy', // Automatically strips completely blank rows
    });

    const headers = meta.fields || [];
    const headerMap = new Map(headers.map((h) => [h.toLowerCase(), h]));

    // 1. Structural Check
    const required = ['Date', 'Exercise', 'Reps', 'Weight'];
    for (const field of required) {
      if (!headerMap.has(field.toLowerCase())) {
        throw new ParseError(`Missing required column: ${field}`, 1, headers.join(','));
      }
    }

    // 2. Extract Context Unit from the actual casing of the Weight header
    const realWeightHeader = headerMap.get('weight')!;
    const effectiveCtx = {
      ...ctx,
      datasetUnit: extractUnitFromHeader(realWeightHeader) ?? ctx.datasetUnit,
    };

    // 3. Process Rows
    const hasUnitColumn = headerMap.has('unit');
    const realUnitHeader = headerMap.get('unit') || '';
    const realRpeHeader = headerMap.get('rpe') || '';

    return data.map((row, idx) => {
      const lineNum = idx + 2; // +1 for 0-index, +1 for header row
      const rawLineStr = Object.values(row).join(',');

      // Destructure using lowercase keys resolved against the actual row object
      const dateStr = row[headerMap.get('date')!];
      const exercise = row[headerMap.get('exercise')!];
      const repsStr = row[headerMap.get('reps')!];
      const weightStr = row[realWeightHeader];

      if (!dateStr || !exercise || !repsStr || !weightStr) {
        throw new ParseError('Missing required field in row', lineNum, rawLineStr);
      }

      const reps = parseFloat_(repsStr);
      if (reps === null) {
        throw new ParseError(`Invalid reps: ${repsStr}`, lineNum, rawLineStr);
      }

      let weight: number | null;
      let recordUnit: Unit | undefined;

      const cellUnit = extractUnitFromCell(weightStr);
      if (cellUnit) {
        ({ weight, unit: recordUnit } = cellUnit);
      } else {
        weight = parseFloat_(weightStr);
        if (weight === null) {
          throw new ParseError(`Invalid weight: ${weightStr}`, lineNum, rawLineStr);
        }

        if (hasUnitColumn) {
          const unitStr = row[realUnitHeader];
          if (unitStr === 'kg' || unitStr === 'lbs') {
            recordUnit = unitStr;
          }
        }
      }

      const finalUnit = resolveUnit(recordUnit, effectiveCtx);
      const rpeStr = row[realRpeHeader];
      const rpeVal = rpeStr ? parseFloat_(rpeStr) : null;

      return {
        date: parseDate(dateStr),
        exercise,
        weight: convertToKg(weight, finalUnit),
        reps,
        rpe: rpeVal ?? undefined,
        meta: { rawUnit: finalUnit, rawWeight: weightStr },
      };
    });
  },
};
