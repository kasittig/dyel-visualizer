import type { RawRow } from '../../types/RawRow';

export interface RepMaxCol {
  reps: number;
  value: string;
}

const REP_MAX_RE = /^(\d+)rm(\W|$)/;

export function findRepMaxCols(row: RawRow): RepMaxCol[] {
  const cols: RepMaxCol[] = [];
  for (const [key, value] of Object.entries(row)) {
    const m = REP_MAX_RE.exec(key);
    if (m) {
      cols.push({ reps: parseInt(m[1]), value });
    }
  }
  return cols;
}
