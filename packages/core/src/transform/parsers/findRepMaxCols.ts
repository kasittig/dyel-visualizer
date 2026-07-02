import type { RawRow } from '../../types/RawRow';
import { REP_MAX_RE } from './repMaxToken';

export interface RepMaxCol {
  reps: number;
  value: string;
}

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
