import type { RawInput, Parser, ParseContext } from './parser';
import { ParseError, resolveUnit } from './parser';
import type { SetRecord, Unit } from '../types';
import Papa from 'papaparse';
import { convertToKg } from './unitConversion';
const parseFloat_ = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

function parseDate(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return d.setHours(0, 0, 0, 0);
}

function extractUnitFromCell(v: string): { weight: number; unit: Unit } | null {
  const m = v.match(/^([\d.]+)(kg|lbs)$/);
  const w = m ? parseFloat_(m[1]) : null;
  return m && w !== null ? { weight: w, unit: m[2] as Unit } : null;
}

export const csvParser: Parser = {
  id: 'csv',
  canParse: (input: RawInput) => {
    return input.name.endsWith('.csv');
  },

  parse(input: RawInput, ctx: ParseContext): SetRecord[] {
    const { data, meta } = Papa.parse<Record<string, string>>(input.content, {
      header: true,
      skipEmptyLines: 'greedy',
    });
    const hMap = new Map(
        (meta.fields || []).map((h) => {
          return [h.toLowerCase(), h];
        })
      ),
      rHeader = hMap.get('unit') || '',
      rRpe = hMap.get('rpe') || '',
      rSets = hMap.get('sets') || '';
    const findH = (f: string) => {
      return [...hMap.entries()].find(([k]) => {
        return k.startsWith(f.toLowerCase());
      })?.[1];
    };

    ['Date', 'Exercise', 'Reps', 'Weight'].forEach((f) => {
      if (!findH(f)) {
        throw new ParseError(`Missing required column: ${f}`, 1, (meta.fields || []).join(','));
      }
    });

    const rWeight = findH('Weight')!,
      effCtx = {
        ...ctx,
        datasetUnit: (rWeight.match(/\((kg|lbs)\)$/)?.[1] as Unit) ?? ctx.datasetUnit,
      };

    return data.map((row, idx) => {
      const lineNum = idx + 2,
        rawStr = Object.values(row).join(','),
        dateStr = row[hMap.get('date')!],
        ex = row[hMap.get('exercise')!],
        repsStr = row[hMap.get('reps')!],
        wStr = row[rWeight];
      if (!dateStr || !ex || !repsStr || !wStr) {
        throw new ParseError('Missing required field in row', lineNum, rawStr);
      }

      const reps = parseInt(repsStr);
      let weight: number | null, rUnit: Unit | undefined;
      const cell = extractUnitFromCell(wStr);

      if (cell) {
        weight = cell.weight;
        rUnit = cell.unit;
      } else {
        weight = parseFloat_(wStr);
        if (weight === null) {
          throw new ParseError(`Invalid weight: ${wStr}`, lineNum, rawStr);
        }
        if (hMap.has('unit') && (row[rHeader] === 'kg' || row[rHeader] === 'lbs')) {
          rUnit = row[rHeader] as Unit;
        }
      }

      const fUnit = resolveUnit(rUnit, effCtx),
        rpe = row[rRpe] ? parseFloat_(row[rRpe]) : null,
        sets = row[rSets] ? parseFloat_(row[rSets]) : null;
      return {
        date: parseDate(dateStr),
        exercise: ex,
        weight: convertToKg(weight, fUnit),
        reps,
        rpe: rpe ?? undefined,
        sets: (row[rSets] ? parseFloat_(row[rSets]) : null) ?? 1,
        meta: { rawUnit: fUnit, rawWeight: wStr, ...(sets !== null && { sets: String(sets) }) },
      };
    });
  },
};
