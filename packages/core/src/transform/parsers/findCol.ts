import type { RawRow } from '../../types/RawRow';

export function findCol(row: RawRow, keyword: string): string | undefined {
  const re = new RegExp(`^${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\W|$)`);
  const key = Object.keys(row).find((k) => re.test(k));
  return key !== undefined ? row[key] : undefined;
}
