import type { RawInput, Parser, ParseContext } from './parser';
import { ParseError, resolveUnit } from './parser';
import type { SetRecord, Unit } from '../types';
import Papa from 'papaparse';
import { convertToKg } from './unitConversion';

const parseNum = (v: string) => {
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

function findHeaderLineIndex(lines: string[]): number {
  return lines.findIndex((l) =>
    l.split(',').some((c) => c.trim().toLowerCase().startsWith('exercise'))
  );
}

function extractUnitFromCell(v: string): { weight: number; unit: Unit } | null {
  const m = v.match(/^([\d.]+)(kg|lbs)$/);
  const w = m ? parseNum(m[1]) : null;
  return m && w !== null ? { weight: w, unit: m[2] as Unit } : null;
}

export const csvParser: Parser = {
  id: 'csv',
  canParse: (input: RawInput) => input.name.endsWith('.csv'),
  parse(input: RawInput, ctx: ParseContext): SetRecord[] {
    const lines = input.content.split('\n');
    const headIdx = findHeaderLineIndex(lines);
    const content = headIdx === -1 ? input.content : lines.slice(headIdx).join('\n');
    const { data, meta } = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: 'greedy',
    });

    const fields = meta.fields || [];
    const hMap = new Map(fields.map((h) => [h.toLowerCase(), h]));
    const findH = (f: string) =>
      [...hMap.entries()].find(([k]) => k.startsWith(f.toLowerCase()))?.[1];
    const headLine = headIdx === -1 ? 1 : headIdx + 1;

    ['Date', 'Exercise', 'Reps', 'Weight'].forEach((f) => {
      if (!findH(f)) {
        throw new ParseError(`Missing required column: ${f}`, headLine, fields.join(','));
      }
    });

    const rWeight = findH('Weight')!;
    const effCtx = {
      ...ctx,
      datasetUnit: (rWeight.match(/\((kg|lbs)\)$/)?.[1] as Unit) ?? ctx.datasetUnit,
    };
    const rUnitCol = hMap.get('unit') || '',
      rRpe = hMap.get('rpe') || '',
      rSets = hMap.get('sets') || '';

    return data.map((row, idx) => {
      const lineNum = idx + 2 + (headIdx === -1 ? 0 : headIdx);
      const rawStr = Object.values(row).join(',');
      const dStr = row[hMap.get('date')!],
        ex = row[hMap.get('exercise')!],
        rStr = row[hMap.get('reps')!],
        wStr = row[rWeight];

      if (!dStr || !ex || !rStr || !wStr) {
        throw new ParseError('Missing required field in row', lineNum, rawStr);
      }

      const reps = parseInt(rStr, 10);
      if (isNaN(reps)) {
        throw new ParseError(`Invalid reps: ${rStr}`, lineNum, rawStr);
      }

      let weight: number | null, rUnit: Unit | undefined;
      const cell = extractUnitFromCell(wStr);

      if (cell) {
        weight = cell.weight;
        rUnit = cell.unit;
      } else {
        weight = parseNum(wStr);
        if (weight === null) {
          throw new ParseError(`Invalid weight: ${wStr}`, lineNum, rawStr);
        }
        if (hMap.has('unit') && (row[rUnitCol] === 'kg' || row[rUnitCol] === 'lbs')) {
          rUnit = row[rUnitCol] as Unit;
        }
      }

      const fUnit = resolveUnit(rUnit, effCtx);
      const rpe = row[rRpe] ? parseNum(row[rRpe]) : null;
      const sets = row[rSets] ? parseNum(row[rSets]) : null;

      return {
        date: parseDate(dStr),
        exercise: ex,
        weight: convertToKg(weight, fUnit),
        reps,
        rpe: rpe ?? undefined,
        sets: sets ?? 1,
        meta: { rawUnit: fUnit, rawWeight: wStr, ...(sets !== null && { sets: String(sets) }) },
      };
    });
  },
};
