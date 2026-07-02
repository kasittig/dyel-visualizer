import type { RawRow } from '../../types/RawRow';

export function parseSessionDate(row: RawRow): Date | null {
  const dateStr = row['date']?.trim() ?? '';
  if (!dateStr) {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(dateStr + 'T00:00:00')
    : new Date(dateStr);
  if (isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseSessionRpe(row: RawRow): number | null {
  const rpeRaw = parseFloat(row['rpe']?.trim() ?? '');
  return !isNaN(rpeRaw) && rpeRaw >= 1 && rpeRaw <= 10 ? rpeRaw : null;
}
