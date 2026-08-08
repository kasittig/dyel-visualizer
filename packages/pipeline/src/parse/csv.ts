import type { RawInput, Parser, ParseContext } from './parser';
import { ParseError, resolveUnit } from './parser';
import type { SetRecord, Unit } from '../types';
import Papa from 'papaparse';
import { convertToKg } from './unitConversion';

const parseNum = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

function parseDate(dateStr: string, lineNum?: number, rawStr?: string): number {
  const trimmed = dateStr.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  // Google Sheets' default published-CSV export renders dates as unpadded M/D/YYYY
  // (e.g. "2/2/2026"), not ISO — accept that shape too so a real published sheet with an
  // unformatted date column (the common case) parses instead of hard-failing the whole file.
  const usSlash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  // Some sheets' date columns are formatted as M/D/YY (2-digit year, e.g. "1/1/26") rather
  // than M/D/YYYY — a real published sheet hit this and hard-failed on the very first row
  // (a single bad row aborts the whole file's .map()), so accept it too. Assumes 20xx.
  const usSlashShortYear = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  const match = iso
    ? [iso[1], iso[2], iso[3]]
    : usSlash
      ? [usSlash[3], usSlash[1], usSlash[2]]
      : usSlashShortYear
        ? [`20${usSlashShortYear[3]}`, usSlashShortYear[1], usSlashShortYear[2]]
        : null;
  if (!match) {
    throw new ParseError(`Invalid date: ${dateStr}`, lineNum, rawStr);
  }
  const [yearStr, monthStr, dayStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  return Date.UTC(year, month - 1, day);
}

function findHeaderLineIndex(lines: string[]): number {
  return lines.findIndex((l) =>
    l.split(',').some((c) => c.trim().toLowerCase().startsWith('exercise'))
  );
}

function extractUnitFromCell(v: string): { weight: number; unit: Unit } | null {
  const m = v.match(/^(\d+(?:\.\d+)?)(kg|lbs)$/i);
  const w = m ? parseNum(m[1]) : null;
  return m && w !== null ? { weight: w, unit: m[2].toLowerCase() as Unit } : null;
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
      rSets = hMap.get('sets') || '',
      rNotes = hMap.get('notes');
    const bodyweightHeader = fields.find((header) =>
      /^(bodyweight|bw)(?: \((lbs|kg)\))?$/i.test(header.trim())
    );
    const bodyweightUnit =
      (bodyweightHeader?.trim().match(/\((lbs|kg)\)$/i)?.[1].toLowerCase() as Unit | undefined) ??
      'lbs';

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
      if (reps <= 0) {
        throw new ParseError(`Reps must be positive: ${reps}`, lineNum, rawStr);
      }

      let weight: number | null, rUnit: Unit | undefined;
      const cell = extractUnitFromCell(wStr);

      if (cell) {
        weight = cell.weight;
        rUnit = cell.unit;
      } else {
        const lowerWStr = wStr.toLowerCase();
        if (lowerWStr.endsWith('kg') || lowerWStr.endsWith('lbs')) {
          throw new ParseError(`Invalid weight: ${wStr}`, lineNum, rawStr);
        }
        weight = parseNum(wStr);
        if (weight === null) {
          throw new ParseError(`Invalid weight: ${wStr}`, lineNum, rawStr);
        }
        if (hMap.has('unit') && (row[rUnitCol] === 'kg' || row[rUnitCol] === 'lbs')) {
          rUnit = row[rUnitCol] as Unit;
        }
      }

      if (weight < 0) {
        throw new ParseError(`Weight must be non-negative: ${weight}`, lineNum, rawStr);
      }

      const fUnit = resolveUnit(rUnit, effCtx);
      const rpe = row[rRpe] ? parseNum(row[rRpe]) : null;
      const sets = row[rSets] ? parseNum(row[rSets]) : null;
      const notes = rNotes ? row[rNotes] : undefined;
      const rawBodyweight = bodyweightHeader ? row[bodyweightHeader]?.trim() : '';
      const bodyweight = rawBodyweight ? parseNum(rawBodyweight) : null;

      if (rawBodyweight && (bodyweight === null || bodyweight < 0)) {
        throw new ParseError(`Invalid bodyweight: ${rawBodyweight}`, lineNum, rawStr);
      }

      return {
        date: parseDate(dStr, lineNum, rawStr),
        exercise: ex,
        weight: convertToKg(weight, fUnit),
        reps,
        rpe: rpe ?? undefined,
        sets: sets ?? 1,
        meta: {
          rawUnit: fUnit,
          rawWeight: wStr,
          ...(sets !== null && { sets: String(sets) }),
          ...(notes && { notes }),
          ...(bodyweight !== null && {
            bodyweight: String(convertToKg(bodyweight, bodyweightUnit)),
            rawBodyweight,
            rawBodyweightUnit: bodyweightUnit,
          }),
        },
      };
    });
  },
};
