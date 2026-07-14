import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

/**
 * Generic column-sort UI state for a table: tracks which column key is active and its
 * direction, and returns `rows` sorted by the caller-supplied per-column accessor.
 * Clicking the active column's header again (via `toggleSort`) flips direction; clicking
 * a different column selects it ascending. Purely a display-ordering transform over an
 * already-computed row array — no business derivation happens here.
 */
export function useSortableRows<T, K extends string>(
  rows: T[],
  accessors: Record<K, (row: T) => string | number>,
  initial?: { key: K; direction?: SortDirection }
) {
  const [sortKey, setSortKey] = useState<K | undefined>(initial?.key);
  const [direction, setDirection] = useState<SortDirection>(initial?.direction ?? 'asc');

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return rows;
    }
    const accessor = accessors[sortKey];
    const sign = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      return av === bv ? 0 : av > bv ? sign : -sign;
    });
  }, [rows, accessors, sortKey, direction]);

  const toggleSort = (key: K) => {
    if (sortKey === key) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('asc');
    }
  };

  return { sortedRows, sortKey, direction, toggleSort };
}
